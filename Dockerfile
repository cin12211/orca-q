FROM node:22-alpine AS builder

WORKDIR /app

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

# Copy and install dependencies with Bun
COPY bun.lock package.json ecosystem.config.js ./
RUN bun install --frozen-lockfile

# Copy app code and build
COPY . .
RUN bun run nuxt:build-web

# 2. Runtime (Node 22 only)
FROM node:22-alpine AS runner

WORKDIR /app
COPY --from=builder /app/.output .output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
# COPY --from=builder /app/ecosystem.config.js .

# Install pm2 globally
# RUN npm install -g pm2

ENV NODE_ENV=production
EXPOSE 3000


CMD ["node", ".output/server/index.mjs"]
# CMD ["pm2-runtime","ecosystem.config.js"]
# CMD ["pm2-runtime", "ecosystem.config.js"]