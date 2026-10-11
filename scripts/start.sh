#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR/uploads"

export DATABASE_URL="${DATABASE_URL:-file:${DATA_DIR}/prod.db}"
export UPLOAD_DIR="${UPLOAD_DIR:-${DATA_DIR}/uploads}"
export NODE_ENV="${NODE_ENV:-production}"

npx prisma db push --skip-generate
npx prisma db seed

exec npx next start --hostname 0.0.0.0 --port "${PORT:-8080}"
