import { z } from "zod";

export const RegionSchema = z.enum(["CZ", "EU", "US"]);
export type Region = z.infer<typeof RegionSchema>;

export const PrivacyModeSchema = z.enum(["minimal", "local_only", "advanced_opt_in"]);
export type PrivacyMode = z.infer<typeof PrivacyModeSchema>;

export const CouponSourceSchema = z.enum(["curated", "community", "affiliate", "partner_feed"]);
export type CouponSource = z.infer<typeof CouponSourceSchema>;

export const CouponStatusSchema = z.enum(["active", "disabled", "expired", "rejected", "pending"]);
export type CouponStatus = z.infer<typeof CouponStatusSchema>;

export const MerchantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2),
  displayName: z.string().min(1),
  primaryDomain: z.string().min(3),
  region: RegionSchema,
  adapterId: z.string().min(2),
  enabled: z.boolean(),
  affiliateDisclosureRequired: z.boolean().default(false),
  fallbackBehavior: z.enum(["ranked_display", "manual_only", "unsupported"]).default("ranked_display")
});
export type Merchant = z.infer<typeof MerchantSchema>;

export const CouponSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  region: RegionSchema,
  code: z.string().min(2).max(80),
  title: z.string().min(1).max(180),
  description: z.string().max(500).optional(),
  status: CouponStatusSchema,
  source: CouponSourceSchema,
  sourceConfidence: z.number().min(0).max(1).default(0.5),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  lastVerifiedAt: z.string().datetime().nullable().optional(),
  successRate30d: z.number().min(0).max(1).nullable().optional(),
  observedSavingsMinor: z.number().int().nonnegative().nullable().optional(),
  observedFinalTotalMinor: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).default("CZK"),
  affiliateNetwork: z.string().max(80).nullable().optional(),
  affiliateDisclosure: z.string().max(500).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  merchantConstraints: z.array(z.string().max(120)).default([])
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CouponRankingReasonSchema = z.object({
  couponId: z.string().uuid(),
  summary: z.string(),
  factors: z.array(z.string()),
  savingsRank: z.number().int().positive().optional(),
  successRate: z.number().min(0).max(1).nullable().optional(),
  affiliateIgnored: z.literal(true)
});
export type CouponRankingReason = z.infer<typeof CouponRankingReasonSchema>;

export const RankedCouponSchema = z.object({
  coupon: CouponSchema,
  score: z.number(),
  reason: CouponRankingReasonSchema
});
export type RankedCoupon = z.infer<typeof RankedCouponSchema>;

export const MerchantSupportStatusSchema = z.object({
  supported: z.boolean(),
  merchant: MerchantSchema.nullable(),
  disclosureFlags: z.object({
    affiliateDisclosureRequired: z.boolean(),
    telemetryDisclosureRequired: z.boolean()
  }),
  fallbackBehavior: z.enum(["ranked_display", "manual_only", "unsupported"])
});
export type MerchantSupportStatus = z.infer<typeof MerchantSupportStatusSchema>;

export const CouponAttemptResultSchema = z.enum([
  "success",
  "failed_invalid",
  "failed_expired",
  "failed_ineligible",
  "failed_checkout_changed",
  "skipped_local_only",
  "error"
]);
export type CouponAttemptResult = z.infer<typeof CouponAttemptResultSchema>;

export const CouponAttemptSchema = z.object({
  merchantId: z.string().uuid(),
  couponId: z.string().uuid().optional(),
  region: RegionSchema,
  result: CouponAttemptResultSchema,
  attemptedAt: z.string().datetime(),
  currency: z.string().length(3),
  subtotalBeforeMinor: z.number().int().nonnegative().optional(),
  finalTotalBeforeMinor: z.number().int().nonnegative().optional(),
  finalTotalAfterMinor: z.number().int().nonnegative().optional(),
  savingsMinor: z.number().int().nonnegative().optional(),
  extensionVersion: z.string().max(40).optional(),
  adapterId: z.string().max(80).optional(),
  privacyMode: PrivacyModeSchema
}).strict();
export type CouponAttempt = z.infer<typeof CouponAttemptSchema>;

export const CouponSubmissionSchema = z.object({
  merchantId: z.string().uuid(),
  region: RegionSchema,
  code: z.string().trim().min(2).max(80),
  title: z.string().trim().min(1).max(180).optional(),
  sourceUrl: z.string().url().optional(),
  notes: z.string().max(500).optional()
}).strict();
export type CouponSubmission = z.infer<typeof CouponSubmissionSchema>;

export const ExtensionConfigSchema = z.object({
  apiVersion: z.literal("v1"),
  supportedRegions: z.array(RegionSchema),
  telemetryDefaults: z.object({
    defaultPrivacyMode: PrivacyModeSchema,
    localOnlyAvailable: z.boolean(),
    advancedAnalyticsOptInAvailable: z.boolean()
  }),
  disclosureCopy: z.object({
    affiliate: z.string(),
    telemetry: z.string(),
    localOnly: z.string()
  }),
  minimumExtensionVersion: z.string()
});
export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;
