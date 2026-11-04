FROM node:22-alpine3.22 AS builder

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=8192"

# Install bash and curl (if not already)
RUN apk add --no-cache bash curl

# Check for Bun; install only if missing
RUN if ! command -v bun > /dev/null 2>&1; then \
  echo "Installing Bun..." && \
  curl -fsSL https://bun.sh/install | bash && \
  export BUN_INSTALL="/root/.bun" && \
  export PATH="$BUN_INSTALL/bin:$PATH"; \
  else \
  echo "Bun already installed"; \
  fi

# Make Bun available for later steps
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Copy workspace manifests first so the install layer is cached
# until a package.json or the lockfile changes.
COPY bun.lock package.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/desktop/package.json apps/desktop/package.json
COPY apps/cli/package.json apps/cli/package.json
RUN bun install --frozen-lockfile --ignore-scripts

# Copy app code and build (root proxy -> apps/web nuxt build)
COPY . .
RUN bun run nuxt:build-web

# 2. Runtime (Node 22 only)
FROM node:22-alpine3.22 AS runner

WORKDIR /app

# Native backup jobs shell out to database client CLIs at runtime:
# - PostgreSQL: pg_dump / pg_restore / psql
# - MySQL/MariaDB: mysqldump / mysql
# - SQLite: sqlite3
RUN apk add --no-cache \
  postgresql17-client \
  mariadb-client \
  sqlite

# Bun workspaces hoist every dependency into the root node_modules
COPY --from=builder /app/apps/web/.output .output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json .

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=9432
EXPOSE 9432

CMD ["node", ".output/server/index.mjs"]
