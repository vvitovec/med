import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CouponAttemptSchema,
  CouponSchema,
  CouponSubmissionSchema,
  RegionSchema,
  privacyExport,
  rankCoupons,
  rejectUnsupportedTelemetryFields,
  shouldSendTelemetry
} from "@trust-coupons/shared";
import type { TrustCouponsRepository } from "../db/repository.js";
import { createAdminGuard } from "./admin-auth.js";
import { extensionConfig } from "../services/extension-config.js";
import type { Queue } from "bullmq";

export interface RegisterRouteOptions {
  repository: TrustCouponsRepository;
  adminSecret?: string | undefined;
  allowedEmailDomain: string;
  queue?: Queue | undefined;
}

export async function registerRoutes(app: FastifyInstance, options: RegisterRouteOptions) {
  const repo = options.repository;
  const adminGuard = createAdminGuard({
    adminSecret: options.adminSecret,
    allowedEmailDomain: options.allowedEmailDomain
  });

  app.get("/healthz", async () => {
    const health = await repo.health();
    return { service: "trust-coupons-api", ok: health.ok, database: health.database };
  });

  app.get("/api/v1/extension-config", async () => extensionConfig());

  app.get("/api/v1/privacy/export", async () => privacyExport());

  app.get("/api/v1/merchants/resolve", async (request, reply) => {
    const query = z.object({ domain: z.string().min(3).max(253) }).safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query", issues: query.error.issues });
    const merchant = await repo.resolveMerchant(query.data.domain);
    if (!merchant || !merchant.enabled) {
      return {
        supported: false,
        merchant: null,
        disclosureFlags: { affiliateDisclosureRequired: false, telemetryDisclosureRequired: true },
        fallbackBehavior: "unsupported"
      };
    }
    return {
      supported: true,
      merchant,
      disclosureFlags: {
        affiliateDisclosureRequired: merchant.affiliateDisclosureRequired,
        telemetryDisclosureRequired: true
      },
      fallbackBehavior: merchant.fallbackBehavior
    };
  });

  app.get("/api/v1/coupons", async (request, reply) => {
    const query = z
      .object({
        merchantId: z.string().uuid(),
        region: RegionSchema
      })
      .safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query", issues: query.error.issues });
    const coupons = await repo.listCoupons({ merchantId: query.data.merchantId, region: query.data.region });
    return {
      coupons: rankCoupons({
        coupons,
        merchantId: query.data.merchantId,
        region: query.data.region
      })
    };
  });

  app.post("/api/v1/coupon-attempts", async (request, reply) => {
    const payload = request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
    const unsupported = rejectUnsupportedTelemetryFields(payload);
    if (unsupported.length > 0) return reply.code(400).send({ error: "unsupported_fields", fields: unsupported });
    const parsed = CouponAttemptSchema.safeParse(payload);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_payload", issues: parsed.error.issues });
    if (!shouldSendTelemetry(parsed.data.privacyMode)) {
      return { ok: true, stored: false, reason: "local_only" };
    }
    await repo.recordAttempt(parsed.data);
    return { ok: true, stored: true };
  });

  app.post("/api/v1/submissions", async (request, reply) => {
    const parsed = CouponSubmissionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_payload", issues: parsed.error.issues });
    const merchant = (await repo.listMerchants()).find((item) => item.id === parsed.data.merchantId);
    if (!merchant || !merchant.enabled) return reply.code(400).send({ error: "unsupported_merchant" });
    if (merchant.region !== parsed.data.region && parsed.data.region !== "EU") {
      return reply.code(400).send({ error: "region_mismatch" });
    }
    const submission = await repo.createSubmission(parsed.data);
    return reply.code(202).send({ ok: true, submission });
  });

  app.get("/api/admin/merchants", { preHandler: adminGuard }, async () => ({ merchants: await repo.listMerchants() }));

  app.patch("/api/admin/merchants/:id", { preHandler: adminGuard }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ enabled: z.boolean() }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "invalid_payload" });
    return { merchant: await repo.setMerchantEnabled(params.data.id, body.data.enabled) };
  });

  app.get("/api/admin/coupons", { preHandler: adminGuard }, async (request) => {
    const query = z.object({ merchantId: z.string().uuid().optional(), region: RegionSchema.optional() }).parse(request.query);
    return {
      coupons: await repo.listCoupons({
        ...(query.merchantId ? { merchantId: query.merchantId } : {}),
        ...(query.region ? { region: query.region } : {}),
        includeInactive: true
      })
    };
  });

  app.post("/api/admin/coupons", { preHandler: adminGuard }, async (request, reply) => {
    const parsed = CouponSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_payload", issues: parsed.error.issues });
    return { coupon: await repo.upsertCoupon(parsed.data) };
  });

  app.get("/api/admin/submissions", { preHandler: adminGuard }, async (request) => {
    const query = z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).parse(request.query);
    return { submissions: await repo.listSubmissions(query.status) };
  });

  app.post("/api/admin/submissions/:id/review", { preHandler: adminGuard }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ status: z.enum(["approved", "rejected"]) }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: "invalid_payload" });
    return { submission: await repo.reviewSubmission(params.data.id, body.data.status) };
  });

  app.get("/api/admin/attempts", { preHandler: adminGuard }, async () => ({ attempts: await repo.listAttempts(100) }));
  app.get("/api/admin/jobs", { preHandler: adminGuard }, async () => ({ jobs: await repo.listWorkerJobs(100) }));
  app.get("/api/admin/telemetry/aggregate", { preHandler: adminGuard }, async () => {
    const attempts = await repo.listAttempts(1000);
    const totalAttempts = attempts.length;
    const successfulAttempts = attempts.filter((attempt) => attempt.result === "success").length;
    const totalSavingsMinor = attempts.reduce((sum, attempt) => sum + (attempt.savingsMinor ?? 0), 0);
    return {
      aggregate: {
        totalAttempts,
        successfulAttempts,
        successRate: totalAttempts === 0 ? 0 : successfulAttempts / totalAttempts,
        totalSavingsMinor
      }
    };
  });

  app.post("/api/admin/jobs/:name", { preHandler: adminGuard }, async (request, reply) => {
    const params = z
      .object({
        name: z.enum([
          "coupon-feed-import",
          "coupon-verification",
          "merchant-health-check",
          "telemetry-aggregation",
          "data-retention-cleanup",
          "backup-verification"
        ])
      })
      .safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_job" });
    if (!options.queue) {
      await repo.recordWorkerJob(params.data.name, "queued_without_redis", {});
      return { ok: true, queued: false, reason: "queue_unavailable" };
    }
    const job = await options.queue.add(params.data.name, {});
    return { ok: true, queued: true, jobId: job.id };
  });
}
