#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/trust-coupons/repo}"
cd "$PROJECT_DIR"

if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
  echo "Created apps/api/.env. Fill DATABASE_URL, ADMIN_DATABASE_URL, ADMIN_SESSION_SECRET, and Supabase service credentials before rerunning."
  exit 1
fi

set -a
source apps/api/.env
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is missing in apps/api/.env"
  exit 1
fi

psql "$DATABASE_URL" -f db/migrations/001_initial_trust_coupons.sql
psql "$DATABASE_URL" -f db/migrations/002_coupon_source_url_and_verified_state.sql

npm ci
npm run build
npm run seed:coupons -w @trust-coupons/api

docker compose build
docker compose up -d api worker

curl -fsS http://127.0.0.1:3100/healthz
echo
echo "Trust Coupons home-server bootstrap complete."
