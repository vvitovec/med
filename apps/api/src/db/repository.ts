import type {
  Coupon,
  CouponAttempt,
  CouponSubmission,
  Merchant,
  Region
} from "@trust-coupons/shared";

export interface CouponSubmissionRecord extends CouponSubmission {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface CouponAttemptRecord extends CouponAttempt {
  id: string;
  createdAt: string;
}

export interface WorkerJobRecord {
  id: string;
  jobName: string;
  status: string;
  payload: unknown;
  result?: unknown;
  createdAt: string;
}

export interface TrustCouponsRepository {
  health(): Promise<{ ok: boolean; database: "ok" | "unavailable" }>;
  listMerchants(): Promise<Merchant[]>;
  resolveMerchant(domain: string): Promise<Merchant | null>;
  setMerchantEnabled(id: string, enabled: boolean): Promise<Merchant>;
  listCoupons(filters?: { merchantId?: string | undefined; region?: Region | undefined; includeInactive?: boolean | undefined }): Promise<Coupon[]>;
  upsertCoupon(coupon: Coupon): Promise<Coupon>;
  createSubmission(submission: CouponSubmission): Promise<CouponSubmissionRecord>;
  listSubmissions(status?: CouponSubmissionRecord["status"]): Promise<CouponSubmissionRecord[]>;
  reviewSubmission(id: string, status: "approved" | "rejected"): Promise<CouponSubmissionRecord>;
  recordAttempt(attempt: CouponAttempt): Promise<CouponAttemptRecord>;
  listAttempts(limit: number): Promise<CouponAttemptRecord[]>;
  recordWorkerJob(jobName: string, status: string, payload: unknown, result?: unknown): Promise<WorkerJobRecord>;
  listWorkerJobs(limit: number): Promise<WorkerJobRecord[]>;
}
