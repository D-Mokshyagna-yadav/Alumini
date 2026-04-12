# Multi-stage Docker build for Alumni Association platform
# 
# ENVIRONMENT VARIABLES (configure in .env or container runtime):
#   NODE_ENV=production      [already set below]
#   PORT=5000                [default, change if needed]
#   REDIS_URL=redis://...    [optional, enables distributed caching]
#   DATABASE_URL=mongodb://... [required for MongoDB connection]
#   WEBSITE_URL=https://...  [canonical frontend URL]
#   ALLOWED_ORIGINS=...      [comma-separated list of allowed origins]
#   ALLOWED_ORIGINS          [for production, explicitly set this]
#
# See .env.example for complete list of environment variables.

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json ./

# Copy client and server package files
COPY client/package.json client/package-lock.json* client/
COPY server/package.json server/package-lock.json* server/

# Install all dependencies (root postinstall will install client + server)
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm install --legacy-peer-deps && \
    apk del .build-deps

# Copy source code
COPY client/ client/
COPY server/ server/

# Build client (Vite) and server (TypeScript)
RUN cd client && npm run build
RUN cd server && npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy root package.json
COPY package.json ./

# Copy server package files and install production deps only
COPY server/package.json server/package-lock.json* server/
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    cd server && npm install --omit=dev --legacy-peer-deps && \
    apk del .build-deps

# Copy built server
COPY --from=builder /app/server/dist server/dist

# Copy built client
COPY --from=builder /app/client/dist client/dist

# Copy any public assets the client needs (e.g., logo)
COPY --from=builder /app/client/public client/public

# Expose the port the server runs on
ENV NODE_ENV=production
EXPOSE 5000

# Health check (requires curl, installed above)
# Coolify and orchestrators use this to verify the app is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "server/dist/index.js"]
