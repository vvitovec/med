# Cloudflare Rules

Production public hostname:

- `coupons-api.vvitovec.com` -> Cloudflare Tunnel -> `http://127.0.0.1:3100`

Required controls:

- TLS: Cloudflare-managed certificate for `coupons-api.vvitovec.com`.
- WAF/rate limit:
  - `POST /api/v1/coupon-attempts`
  - `POST /api/v1/submissions`
  - auth endpoints if exposed later.
- Admin protection:
  - `/admin/*`
  - `/api/admin/*`
  - Prefer Cloudflare Access with allowed emails for `vvitovec.com`.

Do not expose:

- Postgres
- Supabase Studio
- postgres-meta
- Redis
- raw PostgREST as the browser extension write API

The API also has application-level admin protection through `CF-Access-Authenticated-User-Email` or `x-admin-token`.
