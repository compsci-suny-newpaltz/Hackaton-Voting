# Production Dockerfile for Hackathon Management & Voting System
# Uses Debian-based Node to support better-sqlite3 prebuilds/compilation
FROM node:20-bookworm-slim AS base

WORKDIR /app

# Install build tools (for native modules like better-sqlite3 when needed)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for better layer caching
COPY package*.json ./
COPY client/package*.json ./client/

# Install server deps
RUN npm ci || npm install

# Install client deps
WORKDIR /app/client
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Copy source
WORKDIR /app
COPY . .

# Build client (outputs to public/)
RUN npm run build

ENV NODE_ENV=production
EXPOSE 45821

# Ensure entrypoint is executable
RUN chmod +x ./docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
