# Chrome Web Store V1 Release Checklist

## Build the package

Run from the repository root:

```sh
npm ci
npm run typecheck
npm run test
npm run build
npm run validate:manifest
npm run test:extension:live
npm run package:extension
```

Upload `trust-coupons-extension-v0.1.0.zip` to the Chrome Web Store developer dashboard.

## Manual QA before upload

- Load unpacked extension from `apps/extension/dist`.
- Set production API base to `https://coupons-api.vvitovec.com`.
- Confirm `GET /healthz`, `GET /api/v1/extension-config`, merchant resolve, coupon listing, privacy export, and local-only mode work.
- Visit `https://www.alza.cz/Order1.htm`, `https://www.notino.cz/cart/`, `https://www.zalando.cz/cart/`, and `https://www.aboutyou.cz/checkout/basket`.
- Confirm unsupported or empty carts fall back to ranked display instead of auto-applying anything.
- Confirm coupon testing requires explicit user action and shows affiliate/privacy disclosure before testing.
- Confirm local-only mode stores no coupon-attempt telemetry.

## Store listing facts

- Single purpose: find and test best available coupon codes without ranking by affiliate commission.
- Permissions: `activeTab`, `storage`, production/local API hosts, and narrow supported merchant host permissions only.
- Remote code: none. The backend returns data, not executable behavior.
- Data use: anonymous coupon outcome telemetry only when local-only mode is off.
- Public API: `https://coupons-api.vvitovec.com`.
- Source code: `https://github.com/vvitovec/med`.

## Required disclosures

Use the same wording as `GET /api/v1/extension-config` and `GET /api/v1/privacy/export`:

- Affiliate relationships may exist, but ranking never uses affiliate commission.
- Telemetry is minimal and anonymous.
- Local-only mode sends no coupon-attempt telemetry.
- The extension does not collect names, email addresses, payment data, full cart contents, unrelated browsing history, or personal profiles.

## Release hold criteria

Do not publish if any of these fail:

- Manifest validation fails.
- API health check fails.
- Admin routes are publicly reachable without Cloudflare Access or admin auth.
- Raw PostgREST is exposed through the public API hostname.
- Any adapter auto-applies a coupon without explicit user action.
- Any remote executable code is loaded by the extension.
