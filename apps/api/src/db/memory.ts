import type { Coupon, CouponAttempt, CouponSubmission, Merchant } from "@trust-coupons/shared";
import type { CouponAttemptRecord, CouponSubmissionRecord, TrustCouponsRepository, WorkerJobRecord } from "./repository.js";

const merchantIds = {
  alza: "11111111-1111-4111-8111-111111111111",
  notino: "22222222-2222-4222-8222-222222222222",
  zalando: "33333333-3333-4333-8333-333333333333",
  aboutYou: "44444444-4444-4444-8444-444444444444"
};

export class MemoryRepository implements TrustCouponsRepository {
  private merchants: Merchant[] = [
    {
      id: merchantIds.alza,
      slug: "alza",
      displayName: "Alza",
      primaryDomain: "alza.cz",
      region: "CZ",
      adapterId: "cz.alza.checkout.v1",
      enabled: true,
      affiliateDisclosureRequired: true,
      fallbackBehavior: "ranked_display"
    },
    {
      id: merchantIds.notino,
      slug: "notino",
      displayName: "Notino",
      primaryDomain: "notino.cz",
      region: "CZ",
      adapterId: "cz.notino.checkout.v1",
      enabled: true,
      affiliateDisclosureRequired: true,
      fallbackBehavior: "ranked_display"
    },
    {
      id: merchantIds.zalando,
      slug: "zalando",
      displayName: "Zalando",
      primaryDomain: "zalando.cz",
      region: "EU",
      adapterId: "eu.zalando.checkout.v1",
      enabled: true,
      affiliateDisclosureRequired: true,
      fallbackBehavior: "ranked_display"
    },
    {
      id: merchantIds.aboutYou,
      slug: "about-you",
      displayName: "About You",
      primaryDomain: "aboutyou.cz",
      region: "EU",
      adapterId: "eu.about-you.checkout.v1",
      enabled: true,
      affiliateDisclosureRequired: true,
      fallbackBehavior: "ranked_display"
    }
  ];

  private coupons: Coupon[] = [
    {
      id: "55555555-5555-4555-8555-555555555555",
      merchantId: merchantIds.alza,
      region: "CZ",
      code: "ALZA100",
      title: "Verified Alza starter coupon",
      status: "active",
      source: "curated",
      sourceConfidence: 0.9,
      startsAt: null,
      expiresAt: null,
      lastVerifiedAt: new Date().toISOString(),
      successRate30d: 0.72,
      observedSavingsMinor: 10000,
      observedFinalTotalMinor: 189900,
      currency: "CZK",
      affiliateNetwork: null,
      affiliateDisclosure: null,
      sourceUrl: null,
      merchantConstraints: ["May require eligible basket value"]
    }
  ];
  private submissions: CouponSubmissionRecord[] = [];
  private attempts: CouponAttemptRecord[] = [];
  private jobs: WorkerJobRecord[] = [];

  async health() {
    return { ok: true, database: "ok" as const };
  }

  async listMerchants() {
    return this.merchants;
  }

  async resolveMerchant(domain: string) {
    const normalized = domain.replace(/^www\./, "").toLowerCase();
    return this.merchants.find((merchant) => normalized === merchant.primaryDomain || normalized.endsWith(`.${merchant.primaryDomain}`)) ?? null;
  }

  async setMerchantEnabled(id: string, enabled: boolean) {
    const merchant = this.merchants.find((item) => item.id === id);
    if (!merchant) throw new Error("Merchant not found");
    merchant.enabled = enabled;
    return merchant;
  }

  async listCoupons(filters: { merchantId?: string; region?: Coupon["region"]; includeInactive?: boolean } = {}) {
    return this.coupons.filter((coupon) => {
      if (filters.merchantId && coupon.merchantId !== filters.merchantId) return false;
      if (filters.region && coupon.region !== filters.region) return false;
      if (!filters.includeInactive && coupon.status !== "active") return false;
      return true;
    });
  }

  async upsertCoupon(coupon: Coupon) {
    const index = this.coupons.findIndex((item) => item.id === coupon.id);
    if (index >= 0) this.coupons[index] = coupon;
    else this.coupons.push(coupon);
    return coupon;
  }

  async createSubmission(submission: CouponSubmission) {
    const record = { ...submission, id: crypto.randomUUID(), status: "pending" as const, createdAt: new Date().toISOString() };
    this.submissions.push(record);
    return record;
  }

  async listSubmissions(status?: CouponSubmissionRecord["status"]) {
    return status ? this.submissions.filter((submission) => submission.status === status) : this.submissions;
  }

  async reviewSubmission(id: string, status: "approved" | "rejected") {
    const submission = this.submissions.find((item) => item.id === id);
    if (!submission) throw new Error("Submission not found");
    submission.status = status;
    return submission;
  }

  async recordAttempt(attempt: CouponAttempt) {
    const record = { ...attempt, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.attempts.push(record);
    return record;
  }

  async listAttempts(limit: number) {
    return this.attempts.slice(-limit).reverse();
  }

  async recordWorkerJob(jobName: string, status: string, payload: unknown, result?: unknown) {
    const record = { id: crypto.randomUUID(), jobName, status, payload, result, createdAt: new Date().toISOString() };
    this.jobs.push(record);
    return record;
  }

  async listWorkerJobs(limit: number) {
    return this.jobs.slice(-limit).reverse();
  }
}
