# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json ./

# Copy client and server package files
COPY client/package.json client/package-lock.json* client/
COPY server/package.json server/package-lock.json* server/

# Install all dependencies (root postinstall will install client + server)
RUN npm install --legacy-peer-deps

# Copy source code
COPY client/ client/
COPY server/ server/

# Build client (Vite) and server (TypeScript)
RUN cd client && npm run build
RUN cd server && npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy root package.json
COPY package.json ./

# Copy server package files and install production deps only
COPY server/package.json server/package-lock.json* server/
RUN cd server && npm install --omit=dev --legacy-peer-deps

# Copy built server
COPY --from=builder /app/server/dist server/dist

# Copy built client
COPY --from=builder /app/client/dist client/dist

# Copy any public assets the client needs (e.g., logo)
COPY --from=builder /app/client/public client/public

# Expose the port the server runs on
EXPOSE 5000

# Start the server
CMD ["node", "server/dist/index.js"]
