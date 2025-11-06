#!/usr/bin/env bash
set -euo pipefail

# Defaults if not provided
: "${DATABASE_URL:=/app/data/hackathon.db}"
: "${UPLOAD_DIR:=/app/uploads}"
: "${PORT:=45821}"

mkdir -p "$(dirname "$DATABASE_URL")"
mkdir -p "$UPLOAD_DIR"

# Initialize the database if missing
if [ ! -f "$DATABASE_URL" ]; then
  echo "[entrypoint] Database not found at $DATABASE_URL. Initializing..."
  npm run init-db
else
  echo "[entrypoint] Using existing database at $DATABASE_URL"
fi

# Start the server
exec node server/index.js
