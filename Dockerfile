# Stage 1: Build Frontend (Vite + React)
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend (TypeScript + Prisma Client)
FROM node:20-bookworm-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/prisma ./prisma
RUN npx prisma generate && npx prisma generate --schema=prisma/schema.postgres.prisma
COPY backend/ ./
RUN npm run build

# Stage 3: Production Runtime (Node 20 + g++ for C++17 compilation)
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    ca-certificates \
    curl \
    openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=5000 \
    SANDBOX_TYPE=local-process \
    DATABASE_URL="file:/data/codeprep.db" \
    CODEPREP_PCH_DIR="/app/pch"

RUN mkdir -p /data /app/uploads /app/public /app/pch

COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=frontend-builder /app/frontend/dist ./public

# Pre-compile C++17 standard library PCH during image build so runtime Run/Submit never times out
RUN node -e "require('./dist/judge/sandboxRunner').SandboxRunner.warmupCompilerCache().then(ok => { console.log('PCH prebuild:', ok); process.exit(ok ? 0 : 1); })"

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:5000/health || exit 1

CMD ["node", "dist/index.js"]
