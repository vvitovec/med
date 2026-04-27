import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Coupon } from "@trust-coupons/shared";
import { CouponSchema } from "@trust-coupons/shared";
import { loadApiEnv } from "@trust-coupons/config";
import { PostgresRepository } from "../db/postgres.js";

const DiscoverySchema = z.array(
  z.object({
    merchantSlug: z.string(),
    region: z.enum(["CZ", "EU", "US"]),
    code: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.enum(["active", "disabled", "expired", "rejected", "pending"]),
    source: z.enum(["curated", "community", "affiliate", "partner_feed"]),
    sourceConfidence: z.number().min(0).max(1),
    startsAt: z.string().datetime().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    sourceUrl: z.string().url().optional(),
    currency: z.string().length(3),
    merchantConstraints: z.array(z.string()).default([])
  })
);

async function main() {
  const env = loadApiEnv();
  const repo = PostgresRepository.fromConnectionString(env.ADMIN_DATABASE_URL ?? env.DATABASE_URL);
  const merchants = await repo.listMerchants();
  const sourcePath =
    process.env.COUPON_SEED_PATH ??
    resolve(dirname(fileURLToPath(import.meta.url)), "../../../../data/discovered-coupons.json");
  const discoveries = DiscoverySchema.parse(JSON.parse(await readFile(sourcePath, "utf8")));

  for (const discovery of discoveries) {
    const merchant = merchants.find((item) => item.slug === discovery.merchantSlug);
    if (!merchant) throw new Error(`Missing merchant for slug ${discovery.merchantSlug}`);
    const coupon: Coupon = {
      id: crypto.randomUUID(),
      merchantId: merchant.id,
      region: discovery.region,
      code: discovery.code,
      title: discovery.title,
      description: discovery.description,
      status: discovery.status,
      source: discovery.source,
      sourceConfidence: discovery.sourceConfidence,
      startsAt: discovery.startsAt ?? null,
      expiresAt: discovery.expiresAt ?? null,
      lastVerifiedAt: null,
      successRate30d: null,
      observedSavingsMinor: null,
      observedFinalTotalMinor: null,
      currency: discovery.currency,
      affiliateNetwork: null,
      affiliateDisclosure: null,
      sourceUrl: discovery.sourceUrl ?? null,
      merchantConstraints: discovery.merchantConstraints
    };
    CouponSchema.parse(coupon);
    await repo.upsertCoupon(coupon);
    console.log(JSON.stringify({ event: "seeded_coupon", merchant: merchant.slug, code: coupon.code, status: coupon.status }));
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
