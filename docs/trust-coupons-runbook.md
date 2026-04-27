# Trust Coupons Runbook

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env templates:

   ```bash
   cp .env.example .env
   cp config/app.env.example config/app.env
   cp config/worker.env.example config/worker.env
   cp apps/extension/.env.example apps/extension/.env
   ```

3. Run API locally:

   ```bash
   npm run dev:api
   ```

4. Build extension:

   ```bash
   npm run build -w @trust-coupons/extension
   ```

5. Load unpacked extension from `apps/extension/dist` in Chrome.

## Database

Apply migrations to the home Supabase Postgres database `trust_coupons`:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_trust_coupons.sql
psql "$DATABASE_URL" -f db/migrations/002_coupon_source_url_and_verified_state.sql
```

Use a least-privilege runtime user in `DATABASE_URL`. Use service/admin credentials only for migration or admin maintenance workflows.

Seed discovered launch coupons:

```bash
npm run seed:coupons -w @trust-coupons/api
```

## Home Server Deploy

The production API and worker are intended to run on the home server through Docker Compose:

```bash
docker compose build
docker compose up -d api worker
```

The API listens on `127.0.0.1:3100` or `0.0.0.0:3100` depending on `API_HOST`, then Cloudflare Tunnel exposes only `coupons-api.vvitovec.com`.

## Cloudflare Activation

Cloudflare status from local MCP activation:

- `coupons-api.vvitovec.com` DNS CNAME was created.
- The healthy `supabase-home-platform` tunnel now includes `coupons-api.vvitovec.com -> http://127.0.0.1:3100`.
- Cloudflare Access app `Trust Coupons Admin` protects `/api/admin*` and `/admin*` for `vvitovec27@gmail.com`.
- Cloudflare rate limiting is active for `POST /api/v1/coupon-attempts` and `POST /api/v1/submissions`.
  - Current free-plan limit: `10 requests / 10 seconds`, `10 seconds` mitigation.

Remaining manual/server steps:

1. Confirm the API container is listening on `127.0.0.1:3100` on the same host where the Cloudflare tunnel connector runs.
2. Upgrade Cloudflare rate-limit policy later if you need a longer period or a custom counting expression.

## Worker Jobs

Queue name: `trust-coupons`

Supported jobs:

- `coupon-feed-import`
- `coupon-verification`
- `merchant-health-check`
- `telemetry-aggregation`
- `data-retention-cleanup`
- `backup-verification`

Jobs can be triggered from `/api/admin/jobs/:name` and are processed by `npm run worker -w @trust-coupons/api`.

## Chrome Web Store Release

1. Run:

   ```bash
   npm run typecheck
   npm run test
   npm run build
   npm run validate:manifest
   npm run test:extension:live
   npm run package:extension
   ```

2. Verify:

   - no remote executable code
   - no `<all_urls>`
   - explicit checkout permission before testing
   - visible affiliate disclosure
   - Local-only mode blocks telemetry

3. Upload `trust-coupons-extension-v0.1.0.zip`.

4. Submit to Chrome Web Store with privacy disclosures matching `GET /api/v1/privacy/export`.

See `docs/chrome-web-store-release.md` for the full V1 checklist.

## Backup Checks

Backups are home-server responsibilities:

- Postgres `trust_coupons`
- MinIO bucket `trust-coupons`
- API/admin env files
- Cloudflare Tunnel credentials

The `backup-verification` worker currently records a manual-required job result because it cannot inspect backup artifacts safely from the public API container.
