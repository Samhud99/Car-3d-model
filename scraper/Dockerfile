# Using node:20-slim (not Alpine) because Puppeteer/Chromium requires glibc;
# Alpine's musl libc is incompatible with Chromium.
FROM node:20-slim

# Install Chromium and its dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
  && rm -rf /var/lib/apt/lists/*

# Skip Puppeteer's bundled Chromium download — use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and seeds
COPY tsconfig.json ./
COPY src/ ./src/
COPY seeds/ ./seeds/

# Build TypeScript
RUN npm run build

USER 1000:1000

CMD ["node", "dist/index.js"]
