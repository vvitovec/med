import { Pool } from "pg";
import type { Coupon, CouponAttempt, CouponSubmission, Merchant, Region } from "@trust-coupons/shared";
import type { CouponAttemptRecord, CouponSubmissionRecord, TrustCouponsRepository, WorkerJobRecord } from "./repository.js";

function merchantFromRow(row: Record<string, any>): Merchant {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    primaryDomain: row.primary_domain,
    region: row.region,
    adapterId: row.adapter_id,
    enabled: row.enabled,
    affiliateDisclosureRequired: row.affiliate_disclosure_required,
    fallbackBehavior: row.fallback_behavior
  };
}

function couponFromRow(row: Record<string, any>): Coupon {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    region: row.region,
    code: row.code,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    source: row.source,
    sourceConfidence: Number(row.source_confidence),
    startsAt: row.starts_at?.toISOString?.() ?? row.starts_at ?? null,
    expiresAt: row.expires_at?.toISOString?.() ?? row.expires_at ?? null,
    lastVerifiedAt: row.last_verified_at?.toISOString?.() ?? row.last_verified_at ?? null,
    successRate30d: row.success_rate_30d == null ? null : Number(row.success_rate_30d),
    observedSavingsMinor: row.observed_savings_minor,
    observedFinalTotalMinor: row.observed_final_total_minor,
    currency: row.currency,
    affiliateNetwork: row.affiliate_network,
    affiliateDisclosure: row.affiliate_disclosure,
    sourceUrl: row.source_url,
    merchantConstraints: row.merchant_constraints ?? []
  };
}

export class PostgresRepository implements TrustCouponsRepository {
  constructor(private readonly pool: Pool) {}

  static fromConnectionString(connectionString: string) {
    return new PostgresRepository(new Pool({ connectionString, max: 10 }));
  }

  async health() {
    try {
      await this.pool.query("select 1");
      return { ok: true, database: "ok" as const };
    } catch {
      return { ok: false, database: "unavailable" as const };
    }
  }

  async listMerchants() {
    const result = await this.pool.query("select * from merchants order by display_name asc");
    return result.rows.map(merchantFromRow);
  }

  async resolveMerchant(domain: string) {
    const normalized = domain.replace(/^www\./, "").toLowerCase();
    const result = await this.pool.query(
      "select * from merchants where lower($1) = primary_domain or lower($1) like ('%.' || primary_domain) order by enabled desc limit 1",
      [normalized]
    );
    return result.rows[0] ? merchantFromRow(result.rows[0]) : null;
  }

  async setMerchantEnabled(id: string, enabled: boolean) {
    const result = await this.pool.query(
      "update merchants set enabled = $2, updated_at = now() where id = $1 returning *",
      [id, enabled]
    );
    if (!result.rows[0]) throw new Error("Merchant not found");
    return merchantFromRow(result.rows[0]);
  }

  async listCoupons(filters: { merchantId?: string; region?: Region; includeInactive?: boolean } = {}) {
    const clauses = [];
    const values: unknown[] = [];
    if (filters.merchantId) {
      values.push(filters.merchantId);
      clauses.push(`merchant_id = $${values.length}`);
    }
    if (filters.region) {
      values.push(filters.region);
      clauses.push(`region = $${values.length}`);
    }
    if (!filters.includeInactive) {
      clauses.push("status = 'active'");
    }
    const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
    const result = await this.pool.query(`select * from coupons ${where} order by updated_at desc`, values);
    return result.rows.map(couponFromRow);
  }

  async upsertCoupon(coupon: Coupon) {
    const result = await this.pool.query(
      `insert into coupons (
        id, merchant_id, region, code, title, description, status, source, source_confidence,
        starts_at, expires_at, last_verified_at, success_rate_30d, observed_savings_minor,
        observed_final_total_minor, currency, affiliate_network, affiliate_disclosure, source_url, merchant_constraints
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      on conflict (merchant_id, code) do update set
        id = coupons.id,
        merchant_id = excluded.merchant_id,
        region = excluded.region,
        code = excluded.code,
        title = excluded.title,
        description = excluded.description,
        status = excluded.status,
        source = excluded.source,
        source_confidence = excluded.source_confidence,
        starts_at = excluded.starts_at,
        expires_at = excluded.expires_at,
        last_verified_at = excluded.last_verified_at,
        success_rate_30d = excluded.success_rate_30d,
        observed_savings_minor = excluded.observed_savings_minor,
        observed_final_total_minor = excluded.observed_final_total_minor,
        currency = excluded.currency,
        affiliate_network = excluded.affiliate_network,
        affiliate_disclosure = excluded.affiliate_disclosure,
        source_url = excluded.source_url,
        merchant_constraints = excluded.merchant_constraints,
        updated_at = now()
      returning *`,
      [
        coupon.id,
        coupon.merchantId,
        coupon.region,
        coupon.code,
        coupon.title,
        coupon.description ?? null,
        coupon.status,
        coupon.source,
        coupon.sourceConfidence,
        coupon.startsAt ?? null,
        coupon.expiresAt ?? null,
        coupon.lastVerifiedAt ?? null,
        coupon.successRate30d ?? null,
        coupon.observedSavingsMinor ?? null,
        coupon.observedFinalTotalMinor ?? null,
        coupon.currency,
        coupon.affiliateNetwork ?? null,
        coupon.affiliateDisclosure ?? null,
        coupon.sourceUrl ?? null,
        coupon.merchantConstraints
      ]
    );
    return couponFromRow(result.rows[0]);
  }

  async createSubmission(submission: CouponSubmission) {
    const result = await this.pool.query(
      `insert into coupon_submissions (merchant_id, region, code, title, source_url, notes)
       values ($1,$2,$3,$4,$5,$6) returning *`,
      [
        submission.merchantId,
        submission.region,
        submission.code,
        submission.title ?? null,
        submission.sourceUrl ?? null,
        submission.notes ?? null
      ]
    );
    return this.submissionFromRow(result.rows[0]);
  }

  async listSubmissions(status?: CouponSubmissionRecord["status"]) {
    const result = status
      ? await this.pool.query("select * from coupon_submissions where status = $1 order by created_at desc", [status])
      : await this.pool.query("select * from coupon_submissions order by created_at desc");
    return result.rows.map((row) => this.submissionFromRow(row));
  }

  async reviewSubmission(id: string, status: "approved" | "rejected") {
    const result = await this.pool.query(
      "update coupon_submissions set status = $2, reviewed_at = now() where id = $1 returning *",
      [id, status]
    );
    if (!result.rows[0]) throw new Error("Submission not found");
    return this.submissionFromRow(result.rows[0]);
  }

  async recordAttempt(attempt: CouponAttempt) {
    const result = await this.pool.query(
      `insert into coupon_attempts (
        merchant_id, coupon_id, region, result, attempted_at, currency, subtotal_before_minor,
        final_total_before_minor, final_total_after_minor, savings_minor, extension_version,
        adapter_id, privacy_mode
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *`,
      [
        attempt.merchantId,
        attempt.couponId ?? null,
        attempt.region,
        attempt.result,
        attempt.attemptedAt,
        attempt.currency,
        attempt.subtotalBeforeMinor ?? null,
        attempt.finalTotalBeforeMinor ?? null,
        attempt.finalTotalAfterMinor ?? null,
        attempt.savingsMinor ?? null,
        attempt.extensionVersion ?? null,
        attempt.adapterId ?? null,
        attempt.privacyMode
      ]
    );
    return this.attemptFromRow(result.rows[0]);
  }

  async listAttempts(limit: number) {
    const result = await this.pool.query("select * from coupon_attempts order by created_at desc limit $1", [limit]);
    return result.rows.map((row) => this.attemptFromRow(row));
  }

  async recordWorkerJob(jobName: string, status: string, payload: unknown, result?: unknown) {
    const dbResult = await this.pool.query(
      "insert into worker_jobs (job_name, status, payload, result) values ($1,$2,$3,$4) returning *",
      [jobName, status, payload, result ?? null]
    );
    return this.workerJobFromRow(dbResult.rows[0]);
  }

  async listWorkerJobs(limit: number) {
    const result = await this.pool.query("select * from worker_jobs order by created_at desc limit $1", [limit]);
    return result.rows.map((row) => this.workerJobFromRow(row));
  }

  private submissionFromRow(row: Record<string, any>): CouponSubmissionRecord {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      region: row.region,
      code: row.code,
      title: row.title ?? undefined,
      sourceUrl: row.source_url ?? undefined,
      notes: row.notes ?? undefined,
      status: row.status,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at
    };
  }

  private attemptFromRow(row: Record<string, any>): CouponAttemptRecord {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      couponId: row.coupon_id ?? undefined,
      region: row.region,
      result: row.result,
      attemptedAt: row.attempted_at?.toISOString?.() ?? row.attempted_at,
      currency: row.currency,
      subtotalBeforeMinor: row.subtotal_before_minor ?? undefined,
      finalTotalBeforeMinor: row.final_total_before_minor ?? undefined,
      finalTotalAfterMinor: row.final_total_after_minor ?? undefined,
      savingsMinor: row.savings_minor ?? undefined,
      extensionVersion: row.extension_version ?? undefined,
      adapterId: row.adapter_id ?? undefined,
      privacyMode: row.privacy_mode,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at
    };
  }

  private workerJobFromRow(row: Record<string, any>): WorkerJobRecord {
    return {
      id: row.id,
      jobName: row.job_name,
      status: row.status,
      payload: row.payload,
      result: row.result ?? undefined,
      createdAt: row.created_at?.toISOString?.() ?? row.created_at
    };
  }
}
