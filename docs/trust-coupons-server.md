# Trust Coupons Server Architecture

Project slug: `trust-coupons`

Production browser API:

- Public: `https://coupons-api.vvitovec.com`
- Home-server local service: `http://127.0.0.1:3100`
- Runtime: Node API in `apps/api`
- Worker: BullMQ in `apps/api/src/worker`
- Redis: private `127.0.0.1:6380`
- Database: home Supabase Postgres database `trust_coupons`
- Storage: home Supabase Storage/MinIO bucket `trust-coupons`

## Hosting Split

Home server is authoritative for production API, Postgres, Auth if added later, Storage, workers, scheduled verification, telemetry ingestion, and admin backend routes.

Cloudflare provides DNS, TLS, tunnel ingress, WAF/rate limiting, and optional Access protection for admin routes.

Vercel is not used for the production API. It may be used later for marketing or preview-only surfaces.

## Public API

- `GET /healthz`
- `GET /api/v1/extension-config`
- `GET /api/v1/merchants/resolve?domain=...`
- `GET /api/v1/coupons?merchantId=...&region=...`
- `POST /api/v1/coupon-attempts`
- `POST /api/v1/submissions`
- `GET /api/v1/privacy/export`

Admin routes are under `/api/admin/*` and require Cloudflare Access email headers or the configured `x-admin-token`.

## Privacy Model

Default mode is minimal telemetry. The extension sends only anonymous merchant/coupon attempt outcomes, savings in minor currency units, adapter id, and extension version. Local-only mode disables attempt telemetry entirely.

The extension never sends names, email addresses, payment data, full cart contents, unrelated browsing history, or personal profiles.

## Ranking Policy

Coupons are filtered before ranking:

- expired coupons excluded
- disabled, rejected, and pending coupons excluded
- wrong region excluded
- wrong merchant excluded

Ranking uses actual final total and observed savings first, then success rate, recency, constraints, and source confidence. Affiliate commission is not modeled and cannot influence ranking.

## Supabase Home Services

The browser extension must not write directly to PostgREST. It must use `https://coupons-api.vvitovec.com`.

Do not expose:

- Postgres
- Redis
- Supabase Studio
- postgres-meta
- raw PostgREST write endpoints

PostgreSQL functions/RPC may be used internally later, but public browser endpoints remain in the Node API wrapper.
