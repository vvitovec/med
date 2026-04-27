import type { ExtensionConfig } from "@trust-coupons/shared";

export function extensionConfig(): ExtensionConfig {
  return {
    apiVersion: "v1",
    supportedRegions: ["CZ", "EU"],
    telemetryDefaults: {
      defaultPrivacyMode: "minimal",
      localOnlyAvailable: true,
      advancedAnalyticsOptInAvailable: true
    },
    disclosureCopy: {
      affiliate:
        "Some stores may pay us if you choose to use a coupon through supported partner links. We never rank coupons by commission.",
      telemetry:
        "Minimal telemetry records anonymous coupon outcomes so success rates stay useful. It never includes personal details or full cart contents.",
      localOnly:
        "Local-only mode disables coupon-attempt telemetry. You can still view and test coupons, but your outcomes do not improve aggregate success rates."
    },
    minimumExtensionVersion: "0.1.0"
  };
}
