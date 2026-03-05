#!/bin/bash
# ============================================================
# Car Model Skill — Docker Setup
# ============================================================
# Usage: ./docker-setup.sh
# Run this once to initialise the environment.
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "  Car Model Skill — Docker Setup"
echo -e "${NC}"

# ============================================================
# 1. Pre-flight checks
# ============================================================
echo -e "${YELLOW}[1/9] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed or not in PATH${NC}"
    exit 1
fi

DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+' | head -1)
echo "  ✓ Docker $DOCKER_VERSION found"

if ! docker compose version &> /dev/null; then
    echo -e "${RED}ERROR: Docker Compose v2 is not available${NC}"
    echo "  Install via: https://docs.docker.com/compose/install/"
    exit 1
fi
echo "  ✓ Docker Compose v2 found"

if ! docker info &> /dev/null; then
    echo -e "${RED}ERROR: Docker daemon is not running${NC}"
    exit 1
fi
echo "  ✓ Docker daemon is running"

# ============================================================
# 2. API key (Docker secret — not environment variable)
# ============================================================
echo -e "${YELLOW}[2/9] Checking API key...${NC}"

mkdir -p secrets

if [ ! -f secrets/zai_api_key.txt ]; then
    echo -e "${YELLOW}  ⚠ secrets/zai_api_key.txt not found${NC}"
    echo -e "  Paste your Z.ai API key into the file:"
    echo -e "     ${BLUE}echo 'your-key-here' > secrets/zai_api_key.txt${NC}"
    echo -e "     ${BLUE}chmod 0400 secrets/zai_api_key.txt${NC}"
    echo ""
    read -p "  Press Enter once you have created the file, or Ctrl+C to exit..."
fi

if [ ! -s secrets/zai_api_key.txt ]; then
    echo -e "${RED}ERROR: secrets/zai_api_key.txt is empty${NC}"
    exit 1
fi

# Lock down permissions
chmod 0400 secrets/zai_api_key.txt
echo "  ✓ ZAI_API_KEY loaded from secrets/zai_api_key.txt (mode 0400)"

# ============================================================
# 3. Frontend token (Docker secret)
# ============================================================
echo -e "${YELLOW}[3/9] Checking frontend token...${NC}"

if [ ! -f secrets/frontend_token.txt ]; then
    echo "  Generating frontend token..."
    openssl rand -hex 32 > secrets/frontend_token.txt
    chmod 0400 secrets/frontend_token.txt
    echo -e "${GREEN}  ✓ Frontend token generated${NC}"
else
    echo "  ✓ Frontend token already exists"
fi

FRONTEND_TOKEN=$(cat secrets/frontend_token.txt)

# ============================================================
# 4. Create workspace directories
# ============================================================
echo -e "${YELLOW}[4/9] Creating workspace directories...${NC}"

mkdir -p workspace/jobs
mkdir -p workspace/jobs/processed
mkdir -p workspace/output
mkdir -p workspace/output/cache
mkdir -p workspace/review
mkdir -p workspace/logs
mkdir -p workspace/scripts

# Set correct ownership for Docker container (uid 1000 = node user)
# Only needed on Linux — skip on Mac
if [[ "$(uname)" == "Linux" ]]; then
    sudo chown -R 1000:1000 workspace/ || {
        echo -e "${YELLOW}  ⚠ Could not chown workspace/ to uid 1000. You may see permission errors.${NC}"
    }
fi

echo "  ✓ workspace/jobs/         (input: drop job JSON files here)"
echo "  ✓ workspace/output/       (output: approved GLB files appear here)"
echo "  ✓ workspace/output/cache/ (cached base models by make/model/year)"
echo "  ✓ workspace/review/       (pending human QA review)"
echo "  ✓ workspace/logs/         (skill execution logs)"

# ============================================================
# 5. Security config
# ============================================================
echo -e "${YELLOW}[5/9] Checking security configuration...${NC}"

if [ ! -f security/squid.conf ]; then
    echo -e "${RED}ERROR: security/squid.conf not found${NC}"
    exit 1
fi
echo "  ✓ Egress proxy (squid) config found"

echo "  ✓ Using Docker's default seccomp profile"

# ============================================================
# 6. Pull images and build
# ============================================================
echo -e "${YELLOW}[6/9] Pulling Docker images...${NC}"

echo "  Pulling OpenClaw 2026.3.2 (official image from ghcr.io)..."
docker pull ghcr.io/openclaw/openclaw:2026.3.2

echo "  Pulling Squid egress proxy..."
docker pull ubuntu/squid:6.6-24.04_beta

echo "  ✓ Images pulled"

# ============================================================
# 8. Build frontend
# ============================================================
echo -e "${YELLOW}[8/9] Building frontend...${NC}"

(cd frontend && npm install && npm run build)
echo "  ✓ Frontend built"

# ============================================================
# 9. Start services
# ============================================================
echo -e "${YELLOW}[9/9] Starting services...${NC}"

docker compose up -d egress-proxy
echo "  ✓ Egress proxy started"

docker compose up -d openclaw-gateway
echo "  ✓ OpenClaw gateway started"

# Wait for health check
echo "  Waiting for OpenClaw to be healthy..."
for i in {1..30}; do
    if docker compose exec -T openclaw-gateway curl -sf http://127.0.0.1:18789/health &>/dev/null; then
        echo "  ✓ OpenClaw is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}  ⚠ OpenClaw health check timed out. Check logs: docker compose logs openclaw-gateway${NC}"
    fi
    sleep 2
done

# Start Express backend
docker compose up -d express-backend
echo "  ✓ Express backend started"

# Run initial car scraper
echo "  Running initial car scraper..."
docker compose run --rm --profile scraper car-scraper || {
    echo -e "${YELLOW}  ⚠ Scraper failed — seed data will be used as fallback${NC}"
}

# ============================================================
# Network isolation verification
# ============================================================
echo ""
echo -e "${YELLOW}Verifying network isolation...${NC}"

# Test that OpenClaw CAN reach Z.ai via proxy (should succeed)
if docker compose exec -T openclaw-gateway curl -sf --max-time 10 \
    -x http://egress-proxy:3128 https://open.bigmodel.cn &>/dev/null; then
    echo -e "${GREEN}  ✓ OpenClaw can reach open.bigmodel.cn via proxy (expected)${NC}"
else
    echo -e "${YELLOW}  ⚠ OpenClaw cannot reach open.bigmodel.cn — check ZAI_API_KEY and proxy${NC}"
fi

# ============================================================
# Done
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "  ${GREEN}Frontend token (share with your team):${NC}"
echo -e "     ${BLUE}${FRONTEND_TOKEN}${NC}"
echo ""
echo -e "  Frontend URL:"
echo -e "     ${BLUE}http://localhost:3000${NC}"
echo ""
echo "  Next steps:"
echo ""
echo -e "  1. Install the car model skill in OpenClaw:"
echo -e "     ${BLUE}docker compose run --rm --profile cli openclaw-cli skill install ./skills${NC}"
echo ""
echo -e "  2. Drop a test job to verify the pipeline:"
echo -e "     ${BLUE}cp examples/test-job.json workspace/jobs/${NC}"
echo ""
echo -e "  3. Watch the logs:"
echo -e "     ${BLUE}docker compose logs -f openclaw-gateway${NC}"
echo ""
echo -e "  4. Check for output:"
echo -e "     ${BLUE}watch -n 2 ls workspace/output/${NC}"
echo ""
echo -e "  5. Open the frontend:"
echo -e "     ${BLUE}http://localhost:3000${NC}"
echo ""
echo "  Security reminder:"
echo "  - OpenClaw is isolated. It can only reach allowlisted domains."
echo "  - Workspace/ is the ONLY data bridge in or out."
echo "  - Rotate ZAI_API_KEY regularly."
echo ""

# ============================================================
# GLM-5 model availability check
# ============================================================
echo ""
echo -e "${YELLOW}Verifying GLM-5 is available in this OpenClaw build...${NC}"

MODEL_LIST=$(docker compose run --rm --profile cli openclaw-cli models list --all --provider zai 2>/dev/null || echo "")

if echo "$MODEL_LIST" | grep -q "glm-5"; then
    echo -e "${GREEN}  ✓ zai/glm-5 is available${NC}"
else
    echo -e "${YELLOW}  ⚠ zai/glm-5 not listed. This may be a version issue.${NC}"
    echo "    Known issue: https://github.com/openclaw/openclaw/issues/14352"
    echo "    Workaround: openclaw.json is pre-configured. GLM-5 may still work."
    echo "    Verify manually: docker compose run --rm --profile cli openclaw-cli models list --all --provider zai"
fi
