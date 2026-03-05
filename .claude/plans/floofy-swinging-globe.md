# Plan: React Frontend + Car Validation for Car Model Skill

## Context

You want a React frontend so your team can submit car model jobs through a browser instead of dropping JSON files into `workspace/jobs/`. The frontend needs token-based auth (shared API key) and input validation that only allows real car makes, models, and types — sourced from the sites already in your Squid allowlist.

## Architecture

```
Team browser → Express backend (port 3000) → OpenClaw gateway (port 18789)
                      ↑
              Car scraper → cars.json (in workspace/output/)
```

- **Express backend**: sits on both `openclaw-internal` (to reach OpenClaw) and a new `frontend-bridge` network (so team can access it). Serves the built React app as static files AND proxies API calls to OpenClaw. Validates bearer token on every request.
- **Car scraper**: runs on-demand via `docker compose run`, fetches car data from allowlisted sites (carsguide, redbook, carsales, wikipedia) through the egress proxy, writes `workspace/output/cars.json`.
- **React app**: built with Vite, served by Express. Three cascading dropdowns (Make → Model → Type) populated from `cars.json`. Submit button creates a job.

## New files to create

```
frontend/
├── package.json
├── vite.config.ts
├── index.html
├── Dockerfile              (multi-stage: build with node, serve with express)
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/client.ts        (fetch wrapper, attaches bearer token)
    ├── components/
    │   ├── CarForm.tsx      (main form: make/model/type dropdowns + submit)
    │   ├── JobList.tsx      (shows submitted jobs + status)
    │   └── TokenPrompt.tsx  (one-time token entry, saved in sessionStorage)
    ├── hooks/
    │   ├── useCars.ts       (GET /api/cars, returns make/model/type tree)
    │   └── useJobs.ts       (POST /api/jobs, GET /api/jobs/:id polling)
    └── types.ts

backend/
├── package.json
├── tsconfig.json
├── Dockerfile
└── src/
    ├── index.ts             (Express server, serves static React + API routes)
    ├── middleware/auth.ts    (bearer token check against FRONTEND_TOKEN secret)
    ├── routes/
    │   ├── cars.ts          (GET /api/cars → reads cars.json)
    │   └── jobs.ts          (POST /api/jobs → proxy to OpenClaw, GET /api/jobs/:id)
    └── services/
        └── openclaw.ts      (HTTP client for openclaw-gateway:18789)

scraper/
├── package.json
├── Dockerfile
├── seeds/cars-seed.json     (fallback: ~50 common AU cars hardcoded)
└── src/
    ├── index.ts             (entry: run all scrapers, merge, write cars.json)
    └── scrapers/
        ├── carsguide.ts     (scrape www.carsguide.com.au)
        ├── redbook.ts       (scrape www.redbook.com.au)
        └── wikipedia.ts     (scrape en.wikipedia.org car lists)
```

## Changes to existing files

### docker-compose.yml
- Add `express-backend` service (build from `./backend`, ports `0.0.0.0:3000:3000`, networks: `frontend-bridge` + `openclaw-internal`, secret: `frontend_token`)
- Add `car-scraper` service (build from `./scraper`, profile: `scraper` so it only runs on-demand, networks: `openclaw-internal`, uses egress proxy)
- Add `frontend-bridge` network (`internal: false`, subnet `172.20.0.0/24`)
- Add `frontend_token` secret (file: `./secrets/frontend_token.txt`)

### docker-setup.sh
- Add step to generate `secrets/frontend_token.txt` if missing (using `openssl rand -hex 32`)
- Add step to run the scraper once during setup (`docker compose run --rm --profile scraper car-scraper`)
- Print the generated token so the user can share it with the team

### .env.example
- Add `FRONTEND_PORT=3000` variable

## Car validation flow

1. **Scraper** runs once during setup and can be re-run anytime with `docker compose run --rm --profile scraper car-scraper`
2. Scraper fetches from carsguide/redbook/wikipedia via the existing egress proxy, parses HTML for makes/models/types, deduplicates, writes `workspace/output/cars.json`
3. If scraping fails, falls back to `scraper/seeds/cars-seed.json` (~50 common AU cars)
4. **Backend** reads `cars.json` on each `/api/cars` request (with 5-min in-memory cache)
5. **Frontend** fetches car list on load, populates cascading dropdowns: select Make → filters Models → filters Types
6. **Backend** re-validates server-side on job submission: rejects any make/model/type not in `cars.json`

### cars.json schema
```json
{
  "updated": "2026-03-05T12:00:00Z",
  "cars": [
    {
      "make": "Toyota",
      "models": [
        { "name": "Camry", "types": ["Sedan", "Hybrid"] },
        { "name": "RAV4", "types": ["SUV", "Hybrid"] }
      ]
    }
  ]
}
```

## Auth flow

1. User opens `http://<host>:3000` in browser
2. If no token in sessionStorage → shows `TokenPrompt` component (text input)
3. User pastes the shared token (generated during setup, distributed by you)
4. Token stored in sessionStorage (cleared on tab close)
5. Every API call sends `Authorization: Bearer <token>` header
6. Express middleware compares against `/run/secrets/frontend_token`
7. Mismatch → 401 response → frontend shows "Invalid token" and re-prompts

## Security notes

- Express backend bound to `0.0.0.0:3000` so team can access from LAN — acceptable for home network with token auth
- Token stored as Docker secret (not env var), same pattern as ZAI_API_KEY
- Backend is non-root, read-only root FS, all caps dropped — same hardening as other containers
- Scraper uses the existing egress proxy — no new outbound access needed
- No changes to OpenClaw's security posture

## Build order

1. Create `scraper/` with seed data and Dockerfile
2. Create `backend/` with Express server, auth, proxy routes, Dockerfile
3. Create `frontend/` with Vite React app, build it
4. Update `docker-compose.yml` with new services + network
5. Update `docker-setup.sh` with token generation + initial scrape
6. Test full stack: `./docker-setup.sh` then browse to `http://localhost:3000`

## Verification

1. `docker compose up` — all services healthy (check `docker compose ps`)
2. `curl http://localhost:3000/health` — returns 200
3. `curl -H "Authorization: Bearer wrong" http://localhost:3000/api/cars` — returns 401
4. `curl -H "Authorization: Bearer <real-token>" http://localhost:3000/api/cars` — returns car JSON
5. Open browser → enter token → see car dropdowns populated → submit a job → see status update
6. Check `workspace/jobs/` for submitted job JSON
7. Check `workspace/output/cars.json` exists and has valid data
