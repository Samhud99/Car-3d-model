# Car Model Skill — Frontend & Scraper

React frontend + Express backend + car scraper for an OpenClaw-powered 3D car model generation pipeline.

## Architecture

```
Browser → Express backend (port 3000) → OpenClaw gateway (port 18789)
                  ↑
          Car scraper → cars.json
              │
              ├── RACV (Puppeteer, primary)
              ├── CarsGuide (cheerio, fallback)
              ├── Redbook (cheerio, fallback)
              └── Seed data (last resort)
```

- **Frontend** — Vite + React + TypeScript. Token auth, three cascading dropdowns (Make → Model → Type), job submission with status polling.
- **Backend** — Express server. Serves the React app, proxies API calls to OpenClaw, validates car input against scraped data. Bearer token auth via Docker secrets.
- **Scraper** — Fetches Australian car makes/models/types from RACV (Puppeteer), CarsGuide and Redbook (cheerio). Falls back to hardcoded seed data (20 makes, 127 models) if scraping fails.
- **OpenClaw** — AI agent that generates 3D car models (GLB files) using GLM-5.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Samhud99/Car-3d-model.git
cd Car-3d-model

# 2. Add your Z.ai API key
mkdir -p secrets
echo 'your-key-here' > secrets/zai_api_key.txt
chmod 0400 secrets/zai_api_key.txt

# 3. Run setup (generates frontend token, builds frontend, starts services)
chmod +x docker-setup.sh
./docker-setup.sh

# 4. Open the frontend
open http://localhost:3000
```

The setup script will print a **frontend token** — share this with your team so they can access the UI.

## Services

| Service | Port | Network | Description |
|---------|------|---------|-------------|
| `express-backend` | 3000 (LAN) | `openclaw-internal` + `frontend-bridge` | Serves UI + API |
| `openclaw-gateway` | 18789 (loopback) | `openclaw-internal` | AI agent gateway |
| `egress-proxy` | 3128 (internal) | `openclaw-internal` + `internet-egress` | Squid allowlist proxy |
| `car-scraper` | — | `openclaw-internal` | On-demand via `docker compose run` |

## API

All `/api/*` endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (no auth) |
| `GET` | `/api/cars` | Car makes/models/types (5-min cache) |
| `POST` | `/api/jobs` | Submit a car model job `{ make, model, type }` |
| `GET` | `/api/jobs/:id` | Poll job status |

## Re-running the Scraper

The scraper runs once during setup. To refresh car data:

```bash
docker compose run --rm --profile scraper car-scraper
```

## Security

- All containers run as non-root (uid 1000), read-only root filesystem, all Linux capabilities dropped, no-new-privileges.
- OpenClaw has no direct internet access — all outbound traffic routes through Squid with a strict domain allowlist.
- API token stored as a Docker secret, compared using timing-safe equality.
- Frontend token stored in `localStorage` (cleared manually or by the app on 401).

## Project Structure

```
scraper/                    # Car data scraper
  src/scrapers/racv.ts      #   RACV (Puppeteer)
  src/scrapers/carsguide.ts #   CarsGuide (cheerio)
  src/scrapers/redbook.ts   #   Redbook (cheerio)
  seeds/cars-seed.json      #   Fallback seed data (20 AU makes)

backend/                    # Express API server
  src/middleware/auth.ts    #   Bearer token auth
  src/routes/cars.ts        #   GET /api/cars
  src/routes/jobs.ts        #   POST/GET /api/jobs
  src/services/openclaw.ts  #   OpenClaw HTTP client

frontend/                   # React UI
  src/components/CarForm.tsx      # Make/Model/Type dropdowns
  src/components/JobList.tsx      # Job status table
  src/components/TokenPrompt.tsx  # Token entry

docker-compose.yml          # All services
docker-setup.sh             # One-command setup
squid.conf                  # Egress proxy allowlist
```

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript
- **Backend:** Express 4, Node 20
- **Scraper:** Puppeteer 23, cheerio, undici (proxy support)
- **Infra:** Docker Compose, Squid proxy
- **AI:** OpenClaw + GLM-5 (Z.ai)

## License

Private project.
