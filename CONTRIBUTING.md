# Contributing

Trust Coupons exists to make coupon testing transparent and user-aligned.

## Rules

- Do not add ranking logic that considers affiliate commission.
- Do not add browser permissions unless the single-purpose coupon workflow requires them.
- Do not collect personal data, full cart contents, payment details, or unrelated browsing history.
- Keep unverified community/aggregator coupons pending until verified or reviewed.
- Include source URLs and constraints for imported coupon data.

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run validate:manifest
```

## Coupon Data

Coupon submissions should include:

- merchant
- region
- code
- source URL
- expiry if known
- constraints if known
- verification evidence if claiming active status
