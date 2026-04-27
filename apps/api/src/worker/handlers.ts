import type { Job } from "bullmq";
import type { TrustCouponsRepository } from "../db/repository.js";

export type TrustCouponJobName =
  | "coupon-feed-import"
  | "coupon-verification"
  | "merchant-health-check"
  | "telemetry-aggregation"
  | "data-retention-cleanup"
  | "backup-verification";

export async function handleJob(job: Job, repository: TrustCouponsRepository) {
  const name = job.name as TrustCouponJobName;
  const payload = job.data ?? {};

  switch (name) {
    case "coupon-feed-import":
      return record(repository, name, payload, {
        imported: 0,
        status: "stubbed",
        message: "External affiliate/partner feed credentials are not configured yet."
      });
    case "coupon-verification":
      return record(repository, name, payload, {
        verified: 0,
        status: "stubbed",
        message: "Checkout verification workers are ready; live merchant credentials/fixtures are required for production verification."
      });
    case "merchant-health-check": {
      const merchants = await repository.listMerchants();
      return record(repository, name, payload, {
        checked: merchants.length,
        enabled: merchants.filter((merchant) => merchant.enabled).length
      });
    }
    case "telemetry-aggregation": {
      const attempts = await repository.listAttempts(500);
      return record(repository, name, payload, {
        attemptsSampled: attempts.length,
        status: "completed"
      });
    }
    case "data-retention-cleanup":
      return record(repository, name, payload, {
        deleted: 0,
        status: "completed",
        message: "Retention cleanup placeholder completed without deleting data."
      });
    case "backup-verification":
      return record(repository, name, payload, {
        status: "manual_required",
        message: "Verify home-server Postgres and MinIO backup artifacts outside the public API container."
      });
    default:
      throw new Error(`Unsupported job: ${job.name}`);
  }
}

async function record(repository: TrustCouponsRepository, jobName: string, payload: unknown, result: unknown) {
  return repository.recordWorkerJob(jobName, "completed", payload, result);
}
