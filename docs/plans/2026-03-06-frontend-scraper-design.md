# Design: React Frontend + Car Scraper for OpenClaw Car Model Skill

## Architecture

```
Team browser -> Express backend (port 3000) -> OpenClaw gateway (port 18789)
                      |
              Car scraper -> cars.json (workspace/output/)
                  |
                  +-- RACV (Puppeteer, primary)
                  +-- CarsGuide (HTML parse, fallback)
                  +-- Redbook (HTML parse, fallback)
                  +-- Seed file (last resort)
```

- Express backend on `openclaw-internal` + `frontend-bridge` networks
- Serves React static files + proxies API to OpenClaw
- Car scraper runs on-demand via `docker compose run`
- Squid allowlist updated to add `www.racv.com.au`

## Scraper

Container: Node 20 + Chromium (non-Alpine, needs Chromium deps). User 1000:1000, read-only root FS, on-demand only.

Waterfall strategy:
1. **RACV (primary)** -- Puppeteer intercepts network requests to discover internal data API. If found, calls API directly. If not, falls back to DOM extraction from rendered page.
2. **CarsGuide (fallback)** -- HTTP GET + cheerio HTML parsing. Only runs if RACV returns <10 makes.
3. **Redbook (fallback)** -- Same as CarsGuide.
4. **Seed file (last resort)** -- `scraper/seeds/cars-seed.json` with ~50 common AU cars.

Output schema (`workspace/output/cars.json`):
```json
{
  "updated": "2026-03-06T12:00:00Z",
  "source": "racv",
  "cars": [
    { "make": "Toyota", "models": [
      { "name": "Camry", "types": ["Sedan", "Hybrid"] }
    ]}
  ]
}
```

## Backend

Express server:
- Serves React static files from `frontend/dist`
- `/health` (no auth) for Docker healthcheck
- All `/api/*` routes behind bearer token auth middleware
- Token read from `/run/secrets/frontend_token`, timing-safe comparison

Routes:
- `GET /api/cars` -- returns cars.json with 5-min in-memory cache
- `POST /api/jobs` -- validates make/model/type against cars.json, proxies to OpenClaw
- `GET /api/jobs/:id` -- proxies job status from OpenClaw

Container: Node 20 Alpine, user 1000:1000, read-only root FS, on `openclaw-internal` + `frontend-bridge`, port 3000 on 0.0.0.0.

## Frontend

Stack: Vite + React + TypeScript. Built at image build time.

Components:
- **TokenPrompt** -- shown when no token in `localStorage`. Clears and re-prompts on 401.
- **CarForm** -- three cascading dropdowns (Make -> Model -> Type). Submit creates a job.
- **JobList** -- shows submitted jobs with status. Polls every 5s for active jobs.

Hooks:
- **useCars** -- fetches `/api/cars` on mount, caches in state
- **useJobs** -- manages job submission and status polling

API client: fetch wrapper attaching bearer token from `localStorage`. Clears token on 401.

Styling: plain CSS, no UI framework.

## Docker Integration

docker-compose.yml changes:
- Add `express-backend` service (port 3000, both networks, frontend_token secret)
- Add `car-scraper` service (profile: scraper, egress proxy, workspace volume)
- Add `frontend-bridge` network (internal: false, 172.20.0.0/24)
- Add `frontend_token` secret

squid.conf changes:
- Add `www.racv.com.au` to `allowed_car_research` and `allowed_destinations` ACLs

docker-setup.sh changes:
- Generate `secrets/frontend_token.txt` if missing
- Build frontend
- Run initial scraper
- Print generated token

.env.example changes:
- Add `FRONTEND_PORT=3000`

## File Structure

```
scraper/
  package.json, tsconfig.json, Dockerfile
  seeds/cars-seed.json
  src/index.ts
  src/scrapers/racv.ts, carsguide.ts, redbook.ts

backend/
  package.json, tsconfig.json, Dockerfile
  src/index.ts
  src/middleware/auth.ts
  src/routes/cars.ts, jobs.ts
  src/services/openclaw.ts

frontend/
  package.json, vite.config.ts, tsconfig.json, index.html
  src/main.tsx, App.tsx, types.ts
  src/api/client.ts
  src/components/CarForm.tsx, JobList.tsx, TokenPrompt.tsx
  src/hooks/useCars.ts, useJobs.ts
```

## Decisions

| Decision | Choice |
|----------|--------|
| Car data source | RACV primary (Puppeteer), carsguide/redbook fallback |
| Squid allowlist | Override constraint -- add www.racv.com.au |
| Data schema | Normalise to Make/Model/Type |
| Serving model | Single Express container (static + API) |
| Token storage | localStorage (persists across sessions) |
| Scraper image | Large Chromium image OK (on-demand only) |
