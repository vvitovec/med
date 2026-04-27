import type { CouponAttempt, PrivacyMode } from "./schemas.js";

const allowedAttemptFields = new Set<keyof CouponAttempt>([
  "merchantId",
  "couponId",
  "region",
  "result",
  "attemptedAt",
  "currency",
  "subtotalBeforeMinor",
  "finalTotalBeforeMinor",
  "finalTotalAfterMinor",
  "savingsMinor",
  "extensionVersion",
  "adapterId",
  "privacyMode"
]);

export function shouldSendTelemetry(mode: PrivacyMode): boolean {
  return mode !== "local_only";
}

export function rejectUnsupportedTelemetryFields(payload: Record<string, unknown>): string[] {
  return Object.keys(payload).filter((key) => !allowedAttemptFields.has(key as keyof CouponAttempt));
}

export function privacyExport() {
  return {
    modes: {
      minimal: "Sends anonymous merchant domain support checks and coupon attempt outcomes needed to improve success rates.",
      local_only: "Sends no coupon attempt telemetry. Coupon testing still works with locally displayed backend coupon data.",
      advanced_opt_in: "Reserved for explicit opt-in diagnostics. It is never enabled by default."
    },
    collectedByDefault: [
      "merchant id and region",
      "coupon attempt result",
      "anonymous savings amount in minor currency units",
      "extension version and adapter id",
      "service health events"
    ],
    neverCollected: [
      "names, emails, addresses, payment details, account identifiers",
      "full cart contents",
      "unrelated browsing history",
      "cross-site profiles for resale"
    ]
  };
}
