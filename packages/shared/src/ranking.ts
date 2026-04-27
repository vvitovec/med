import type { Coupon, RankedCoupon } from "./schemas.js";

export interface RankCouponsInput {
  coupons: Coupon[];
  merchantId: string;
  region: Coupon["region"];
  now?: Date;
}

function isExpired(coupon: Coupon, now: Date): boolean {
  return Boolean(coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime());
}

function isStarted(coupon: Coupon, now: Date): boolean {
  return !coupon.startsAt || new Date(coupon.startsAt).getTime() <= now.getTime();
}

function verificationFreshness(coupon: Coupon, now: Date): number {
  if (!coupon.lastVerifiedAt) return 0;
  const ageMs = now.getTime() - new Date(coupon.lastVerifiedAt).getTime();
  const ageDays = Math.max(0, ageMs / 86_400_000);
  return Math.max(0, 1 - ageDays / 60);
}

export function eligibleCoupons(input: RankCouponsInput): Coupon[] {
  const now = input.now ?? new Date();
  return input.coupons.filter((coupon) => {
    if (coupon.merchantId !== input.merchantId) return false;
    if (coupon.region !== input.region) return false;
    if (coupon.status !== "active") return false;
    if (!isStarted(coupon, now)) return false;
    if (isExpired(coupon, now)) return false;
    return true;
  });
}

export function rankCoupons(input: RankCouponsInput): RankedCoupon[] {
  const now = input.now ?? new Date();
  const eligible = eligibleCoupons({ ...input, now });
  const sortedBySavings = [...eligible].sort((a, b) => {
    const totalA = a.observedFinalTotalMinor ?? Number.MAX_SAFE_INTEGER;
    const totalB = b.observedFinalTotalMinor ?? Number.MAX_SAFE_INTEGER;
    if (totalA !== totalB) return totalA - totalB;
    return (b.observedSavingsMinor ?? 0) - (a.observedSavingsMinor ?? 0);
  });
  const savingsRank = new Map(sortedBySavings.map((coupon, index) => [coupon.id, index + 1]));

  return eligible
    .map((coupon) => {
      const finalTotalSignal =
        coupon.observedFinalTotalMinor == null ? 0 : 1_000_000_000 - coupon.observedFinalTotalMinor;
      const savingsSignal = coupon.observedSavingsMinor ?? 0;
      const successSignal = Math.round((coupon.successRate30d ?? 0.25) * 100_000);
      const freshnessSignal = Math.round(verificationFreshness(coupon, now) * 10_000);
      const confidenceSignal = Math.round(coupon.sourceConfidence * 1_000);
      const score = finalTotalSignal + savingsSignal + successSignal + freshnessSignal + confidenceSignal;
      const factors = [
        coupon.observedFinalTotalMinor == null
          ? "No verified final-total observation yet"
          : `Lowest observed final total: ${coupon.observedFinalTotalMinor} ${coupon.currency} minor units`,
        `Recent success rate: ${Math.round((coupon.successRate30d ?? 0) * 100)}%`,
        `Source confidence: ${Math.round(coupon.sourceConfidence * 100)}%`
      ];
      if (coupon.merchantConstraints.length > 0) {
        factors.push(`Known constraints: ${coupon.merchantConstraints.join(", ")}`);
      }
      factors.push("Affiliate commission is ignored by ranking.");

      return {
        coupon,
        score,
        reason: {
          couponId: coupon.id,
          summary:
            coupon.observedSavingsMinor && coupon.observedSavingsMinor > 0
              ? `Ranked by verified savings and recent success rate.`
              : `Ranked by success history and source confidence until a verified checkout total is available.`,
          factors,
          savingsRank: savingsRank.get(coupon.id),
          successRate: coupon.successRate30d ?? null,
          affiliateIgnored: true as const
        }
      };
    })
    .sort((a, b) => {
      const aTotal = a.coupon.observedFinalTotalMinor;
      const bTotal = b.coupon.observedFinalTotalMinor;
      if (aTotal != null && bTotal != null && aTotal !== bTotal) return aTotal - bTotal;
      if (aTotal != null && bTotal == null) return -1;
      if (aTotal == null && bTotal != null) return 1;
      return b.score - a.score;
    });
}
