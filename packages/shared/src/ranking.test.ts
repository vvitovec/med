import { describe, expect, it } from "vitest";
import type { Coupon } from "./schemas.js";
import { eligibleCoupons, rankCoupons } from "./ranking.js";

const merchantId = "11111111-1111-4111-8111-111111111111";
const otherMerchantId = "22222222-2222-4222-8222-222222222222";

function coupon(overrides: Partial<Coupon>): Coupon {
  return {
    id: crypto.randomUUID(),
    merchantId,
    region: "CZ",
    code: "SAVE",
    title: "Save",
    status: "active",
    source: "curated",
    sourceConfidence: 0.8,
    startsAt: null,
    expiresAt: null,
    lastVerifiedAt: "2026-04-01T00:00:00.000Z",
    successRate30d: 0.5,
    observedSavingsMinor: 1000,
    observedFinalTotalMinor: 9000,
    currency: "CZK",
    affiliateNetwork: null,
    affiliateDisclosure: null,
    sourceUrl: null,
    merchantConstraints: [],
    ...overrides
  };
}

describe("coupon ranking", () => {
  it("ignores affiliate commission and ranks by verified final total", () => {
    const highCommission = coupon({
      code: "AFFBIG",
      source: "affiliate",
      observedSavingsMinor: 5000,
      observedFinalTotalMinor: 12000,
      successRate30d: 0.99
    });
    const lowerTotal = coupon({
      code: "BESTTOTAL",
      source: "curated",
      observedSavingsMinor: 1000,
      observedFinalTotalMinor: 8000,
      successRate30d: 0.4
    });

    const ranked = rankCoupons({ coupons: [highCommission, lowerTotal], merchantId, region: "CZ" });

    expect(ranked[0]?.coupon.code).toBe("BESTTOTAL");
    expect(ranked[0]?.reason.affiliateIgnored).toBe(true);
    expect(ranked[0]?.reason.factors.join(" ")).toContain("Affiliate commission is ignored");
  });

  it("lets lowest final total beat highest nominal discount", () => {
    const highDiscount = coupon({ code: "50OFF", observedSavingsMinor: 5000, observedFinalTotalMinor: 15000 });
    const lowerTotal = coupon({ code: "FREESHIP", observedSavingsMinor: 2000, observedFinalTotalMinor: 12000 });
    expect(rankCoupons({ coupons: [highDiscount, lowerTotal], merchantId, region: "CZ" })[0]?.coupon.code).toBe(
      "FREESHIP"
    );
  });

  it("excludes expired coupons", () => {
    const expired = coupon({ status: "active", expiresAt: "2026-01-01T00:00:00.000Z" });
    expect(
      eligibleCoupons({
        coupons: [expired],
        merchantId,
        region: "CZ",
        now: new Date("2026-04-27T00:00:00.000Z")
      })
    ).toHaveLength(0);
  });

  it("excludes wrong region and wrong merchant coupons", () => {
    const wrongRegion = coupon({ region: "EU" });
    const wrongMerchant = coupon({ merchantId: otherMerchantId });
    expect(eligibleCoupons({ coupons: [wrongRegion, wrongMerchant], merchantId, region: "CZ" })).toHaveLength(0);
  });

  it("does not promote pending community coupons", () => {
    const pending = coupon({ source: "community", status: "pending" });
    expect(eligibleCoupons({ coupons: [pending], merchantId, region: "CZ" })).toHaveLength(0);
  });
});
