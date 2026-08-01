# ══════════════════════════════════════════════
#  BalanceCycle — Frontend Dockerfile
#  Multi-stage: Node build → nginx static serve
# ══════════════════════════════════════════════

# ── Stage 1: build the Vite/React app ───────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Cache node_modules layer separately
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .

# VITE_API_URL is injected at build time via docker-compose (see .env.docker)
# If not provided, the nginx proxy handles /api → backend
RUN npm run build


# ── Stage 2: serve with nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Our custom nginx config (handles React Router + /api proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/health.txt || exit 1

CMD ["nginx", "-g", "daemon off;"]
