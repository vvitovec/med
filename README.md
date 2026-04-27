# Trust Coupons

Trust-first Chrome MV3 coupon tester for selected CZ/EU merchants.

Production API target: `https://coupons-api.vvitovec.com`

Home-server local API target: `http://127.0.0.1:3100`

## Workspace

- `apps/api` - Node/Fastify API service and BullMQ worker for the home server.
- `apps/extension` - Chrome Manifest V3 extension.
- `apps/admin` - basic admin/moderation UI for protected backend routes.
- `packages/shared` - shared Zod schemas, privacy helpers, and ranking logic.
- `packages/adapters` - merchant adapter contracts and bundled pilot adapters.
- `packages/config` - environment and public endpoint helpers.
- `db/migrations` - Postgres schema for `trust_coupons`.
- `infra/cloudflare` - tunnel/rules docs.

## Core Guarantees

- Coupon ranking never uses affiliate commission.
- Community submissions stay pending until moderated.
- Local-only privacy mode sends no coupon-attempt telemetry.
- Extension code is bundled; backend returns data, not executable behavior.
- Production browser writes go through the API wrapper, not raw PostgREST.

See [docs/transparency.md](docs/transparency.md) for the public ranking, affiliate, and privacy commitments.
