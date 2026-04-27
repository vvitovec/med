# Prompt For Codex On The Home Server

Run this in a Codex session on the home server where Supabase-home, Docker Compose, Postgres, Redis, and MinIO are reachable:

```text
You are on the home server. Finish production activation for the Trust Coupons project.

Facts:
- Project slug: trust-coupons
- Repo path should be /opt/trust-coupons/repo unless an existing trust-coupons/repo exists.
- Public API: https://coupons-api.vvitovec.com
- Local API: http://127.0.0.1:3100
- Supabase-home DB: trust_coupons
- Redis: redis://127.0.0.1:6380
- Storage bucket: trust-coupons
- Do not expose Postgres, Redis, Studio, postgres-meta, or raw PostgREST publicly.
- Do not use Supabase Edge Functions.

Tasks:
1. Ensure the repo is present at /home/viktoor/srv/apps/trust-coupons/repo if that is the hostops-registered path. Pull the latest public GitHub version from https://github.com/vvitovec/med.git if remote is configured.
2. Create a least-privilege Postgres runtime user for the API if missing.
3. Fill config/app.env and config/worker.env from their examples:
   - API_HOST=127.0.0.1 or 0.0.0.0 only if Docker networking requires it
   - API_PORT=3100
   - DATABASE_URL for runtime DB user
   - ADMIN_DATABASE_URL for migration/admin tasks if used
   - REDIS_URL=redis://127.0.0.1:6380
   - ADMIN_SESSION_SECRET with a new strong value
   - SUPABASE_URL for local home Supabase API
   - SUPABASE_STORAGE_BUCKET=trust-coupons
   - SUPABASE_SERVICE_ROLE_KEY only if storage/feed import code needs it
4. Apply db/migrations/001_initial_trust_coupons.sql and db/migrations/002_coupon_source_url_and_verified_state.sql.
5. Ensure MinIO/Supabase Storage bucket trust-coupons exists and is private.
6. Run npm ci, npm run build, npm run test, npm run seed:coupons.
7. Start production API and worker with docker compose up -d api worker.
8. Verify:
   - curl http://127.0.0.1:3100/healthz
   - curl https://coupons-api.vvitovec.com/healthz
   - curl https://coupons-api.vvitovec.com/api/v1/extension-config
9. Confirm Cloudflare Tunnel routes coupons-api.vvitovec.com to http://127.0.0.1:3100 and that admin paths are behind Cloudflare Access.
10. Report exact errors and logs if any step fails. Do not expose secrets in the report.
```
