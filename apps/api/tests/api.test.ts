import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { MemoryRepository } from "../src/db/memory.js";

async function testApp() {
  return buildApp({
    repository: new MemoryRepository(),
    adminSecret: "test-admin-secret-with-more-than-32-chars",
    allowedEmailDomain: "vvitovec.com"
  });
}

describe("public API", () => {
  it("returns health and extension config", async () => {
    const app = await testApp();
    const health = await app.inject({ method: "GET", url: "/healthz" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, database: "ok" });
    const config = await app.inject({ method: "GET", url: "/api/v1/extension-config" });
    expect(config.json().telemetryDefaults.localOnlyAvailable).toBe(true);
  });

  it("resolves supported merchants", async () => {
    const app = await testApp();
    const response = await app.inject({ method: "GET", url: "/api/v1/merchants/resolve?domain=www.alza.cz" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ supported: true, merchant: { slug: "alza" } });
  });

  it("lists ranked coupons with affiliate ignored reasons", async () => {
    const app = await testApp();
    const resolve = await app.inject({ method: "GET", url: "/api/v1/merchants/resolve?domain=alza.cz" });
    const merchantId = resolve.json().merchant.id;
    const response = await app.inject({ method: "GET", url: `/api/v1/coupons?merchantId=${merchantId}&region=CZ` });
    expect(response.statusCode).toBe(200);
    expect(response.json().coupons[0].reason.affiliateIgnored).toBe(true);
  });

  it("suppresses local-only telemetry", async () => {
    const app = await testApp();
    const resolve = await app.inject({ method: "GET", url: "/api/v1/merchants/resolve?domain=alza.cz" });
    const merchantId = resolve.json().merchant.id;
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/coupon-attempts",
      payload: {
        merchantId,
        region: "CZ",
        result: "skipped_local_only",
        attemptedAt: new Date().toISOString(),
        currency: "CZK",
        privacyMode: "local_only"
      }
    });
    expect(response.json()).toMatchObject({ ok: true, stored: false });
  });

  it("rejects unsupported telemetry fields", async () => {
    const app = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/coupon-attempts",
      payload: { email: "person@example.com" }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("unsupported_fields");
  });

  it("keeps submissions pending", async () => {
    const app = await testApp();
    const resolve = await app.inject({ method: "GET", url: "/api/v1/merchants/resolve?domain=alza.cz" });
    const merchantId = resolve.json().merchant.id;
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/submissions",
      payload: { merchantId, region: "CZ", code: "NEWCODE", title: "Community coupon" }
    });
    expect(response.statusCode).toBe(202);
    expect(response.json().submission.status).toBe("pending");
  });
});

describe("admin API", () => {
  it("protects admin endpoints", async () => {
    const app = await testApp();
    const response = await app.inject({ method: "GET", url: "/api/admin/merchants" });
    expect(response.statusCode).toBe(401);
  });

  it("allows configured admin token", async () => {
    const app = await testApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/merchants",
      headers: { "x-admin-token": "test-admin-secret-with-more-than-32-chars" }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().merchants.length).toBeGreaterThan(0);
  });
});
