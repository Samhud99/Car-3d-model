# Frontend dist is volume-mounted at /app/frontend/dist via docker-compose,
# not baked into this image. This allows frontend rebuilds without re-building
# the backend container.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --production
USER 1000:1000
EXPOSE 3000
CMD ["node", "dist/index.js"]
