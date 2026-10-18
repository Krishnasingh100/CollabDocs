# CollabDocs — production image.
# Reproducible install with Bun (uses the real bun.lock), build and runtime on
# Node (Next.js requires node for its CLI and production server).
# Build:   docker build -t collabdocs .
# Run:     docker run -p 3000:3000 --env-file .env collabdocs
# Or use:  docker compose up --build

# ---- install ---------------------------------------------------------------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- build -----------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json next.config.mjs postcss.config.mjs jsconfig.json ./
COPY src ./src
COPY public ./public
# Public Liveblocks key must exist at build time: Next inlines NEXT_PUBLIC_*
# variables from the build environment into the browser bundle.
ARG NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=""
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=$NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY
RUN node node_modules/.bin/next build
# Standalone-style slim output includes the standalone server too; we ship the
# normal build below because no output config change is wanted for local runs.

# ---- runtime ---------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY package.json next.config.mjs ./
EXPOSE 3000
# Secrets (DATABASE_URL, NEON_AUTH_*, LIVEBLOCKS_SECRET_KEY) are passed at
# runtime with --env-file or compose. NEON auth cookies must be http/https;
# behind a reverse proxy set the public host origin accordingly.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/db').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/next/dist/bin/next", "start"]
