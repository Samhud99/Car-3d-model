# Car Model Skill — Frontend & Scraper

React frontend + Express backend + car scraper for an OpenClaw-powered 3D car model generation pipeline.

**Bring your own API key** — users authenticate by providing their own AI provider credentials. No server-side keys needed. You pay for your own usage.

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

- **Frontend** — Vite + React + TypeScript. Users enter their AI provider and API key to authenticate. Three cascading dropdowns (Make -> Model -> Type), job submission with status polling.
- **Backend** — Express server. Validates API keys against the provider, passes user credentials through to OpenClaw for the AI workload. Serves the React app as static files.
- **Scraper** — Fetches Australian car makes/models/types from RACV (Puppeteer), CarsGuide and Redbook (cheerio). Falls back to hardcoded seed data (20 makes, 127 models) if scraping fails.
- **OpenClaw** — AI agent that generates 3D car models (GLB files).

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Samhud99/Car-3d-model.git
cd Car-3d-model

# 2. Run setup (builds frontend, starts services)
chmod +x docker-setup.sh
./docker-setup.sh

# 3. Open the frontend
open http://localhost:3000
```

On first visit, select your AI provider (Z.ai, OpenAI, or Anthropic) and enter your API key. Your key is stored in your browser's localStorage and sent with each request — it's never stored on the server.

## Supported Providers

| Provider | What you need |
|----------|---------------|
| Z.ai (GLM-5) | API key from [z.ai/subscribe](https://z.ai/subscribe) |
| OpenAI | API key from [platform.openai.com](https://platform.openai.com) |
| Anthropic | API key from [console.anthropic.com](https://console.anthropic.com) |

## Services

| Service | Port | Network | Description |
|---------|------|---------|-------------|
| `express-backend` | 3000 (LAN) | `openclaw-internal` + `frontend-bridge` | Serves UI + API |
| `openclaw-gateway` | 18789 (loopback) | `openclaw-internal` | AI agent gateway |
| `egress-proxy` | 3128 (internal) | `openclaw-internal` + `internet-egress` | Squid allowlist proxy |
| `car-scraper` | — | `openclaw-internal` | On-demand via `docker compose run` |

## API

All `/api/*` endpoints require `X-Provider` and `X-Api-Key` headers.

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

- **No server-side API keys required** — users bring their own. Keys are validated against the provider and cached (hashed) for 10 minutes.
- User API keys are never persisted on the server — only held in memory during request processing.
- All containers run as non-root (uid 1000), read-only root filesystem, all Linux capabilities dropped, no-new-privileges.
- OpenClaw has no direct internet access — all outbound traffic routes through Squid with a strict domain allowlist.

## Project Structure

```
scraper/                    # Car data scraper
  src/scrapers/racv.ts      #   RACV (Puppeteer)
  src/scrapers/carsguide.ts #   CarsGuide (cheerio)
  src/scrapers/redbook.ts   #   Redbook (cheerio)
  seeds/cars-seed.json      #   Fallback seed data (20 AU makes)

backend/                    # Express API server
  src/middleware/auth.ts    #   API key validation
  src/routes/cars.ts        #   GET /api/cars
  src/routes/jobs.ts        #   POST/GET /api/jobs
  src/services/openclaw.ts  #   OpenClaw HTTP client

frontend/                   # React UI
  src/components/CarForm.tsx        # Make/Model/Type dropdowns
  src/components/JobList.tsx        # Job status table
  src/components/ProviderPrompt.tsx # Provider + API key entry

docker-compose.yml          # All services
docker-setup.sh             # One-command setup
squid.conf                  # Egress proxy allowlist
```

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript
- **Backend:** Express 4, Node 20
- **Scraper:** Puppeteer 23, cheerio, undici (proxy support)
- **Infra:** Docker Compose, Squid proxy
- **AI:** OpenClaw + GLM-5 / OpenAI / Anthropic (user's choice)

## License

MIT
