# Build Instructions for Claude Code

## What to build

Read the plan file at `.claude/plans/floofy-swinging-globe.md` for the full architecture and file list. In short: build a React frontend + Express backend + car scraper for an existing Dockerised OpenClaw car model skill.

## Build order (follow this exactly)

### Phase 1: Scraper
1. Create `scraper/` directory structure
2. Write `scraper/seeds/cars-seed.json` — hardcode ~50 common Australian car makes/models/types as fallback data
3. Write scraper source files (`src/index.ts`, `src/scrapers/carsguide.ts`, `src/scrapers/redbook.ts`, `src/scrapers/wikipedia.ts`)
4. Write `scraper/package.json` and `scraper/tsconfig.json`
5. Write `scraper/Dockerfile` (Node 20 Alpine, non-root user 1000)
6. Run `npm install` in scraper/ to generate lock file

### Phase 2: Backend
1. Create `backend/` directory structure
2. Write Express server (`src/index.ts`) — serves React static files from `../frontend/dist` AND handles API routes
3. Write auth middleware (`src/middleware/auth.ts`) — reads token from `/run/secrets/frontend_token` or `FRONTEND_TOKEN` env var
4. Write routes (`src/routes/cars.ts`, `src/routes/jobs.ts`)
5. Write OpenClaw client (`src/services/openclaw.ts`) — proxies to `http://openclaw-gateway:18789`
6. Write `backend/package.json` and `backend/tsconfig.json`
7. Write `backend/Dockerfile` (Node 20 Alpine, non-root user 1000, copies frontend/dist into image)
8. Run `npm install` in backend/ to generate lock file

### Phase 3: Frontend
1. Create `frontend/` directory structure
2. Write `frontend/package.json` with Vite + React + TypeScript deps
3. Write `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`
4. Write React components: `src/main.tsx`, `src/App.tsx`, `src/components/CarForm.tsx`, `src/components/JobList.tsx`, `src/components/TokenPrompt.tsx`
5. Write hooks: `src/hooks/useCars.ts`, `src/hooks/useJobs.ts`
6. Write API client: `src/api/client.ts`
7. Write types: `src/types.ts`
8. Run `npm install` in frontend/
9. Run `npm run build` in frontend/ to produce `dist/`

### Phase 4: Docker integration
1. Update `docker-compose.yml` — add `express-backend` service, `car-scraper` service (profile: scraper), `frontend-bridge` network, `frontend_token` secret
2. Update `docker-setup.sh` — add frontend token generation step, add initial scraper run
3. Update `.env.example` — add `FRONTEND_PORT=3000`

### Phase 5: Verification
1. Check all files exist and are syntactically valid
2. Verify docker-compose.yml parses: `docker compose config`
3. Verify TypeScript compiles in each project: `npx tsc --noEmit`
4. Verify frontend builds: `cd frontend && npm run build`

## Key constraints
- All containers must run as user 1000:1000, read-only root FS, all caps dropped, no-new-privileges
- Express backend must be on BOTH `openclaw-internal` and `frontend-bridge` networks
- Car scraper must use the egress proxy (`HTTPS_PROXY=http://egress-proxy:3128`)
- Frontend token stored as Docker secret at `./secrets/frontend_token.txt`
- cars.json goes in `workspace/output/cars.json`
- Do NOT modify `openclaw.json` or `squid.conf` — those are already configured

## Existing files (do not overwrite unless specified in Phase 4)
- `docker-compose.yml` — UPDATE (add services, keep existing ones intact)
- `docker-setup.sh` — UPDATE (add steps, keep existing ones intact)
- `.env.example` — UPDATE (add vars, keep existing ones intact)
- `openclaw.json` — DO NOT TOUCH
- `squid.conf` — DO NOT TOUCH
- `security-assessment.md` — DO NOT TOUCH
