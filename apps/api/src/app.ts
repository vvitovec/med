import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Queue } from "bullmq";
import { registerRoutes } from "./http/routes.js";
import type { TrustCouponsRepository } from "./db/repository.js";

export interface BuildAppOptions {
  repository: TrustCouponsRepository;
  adminSecret?: string | undefined;
  allowedEmailDomain?: string;
  queue?: Queue | undefined;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: [/^chrome-extension:\/\//, /^http:\/\/localhost(:\d+)?$/, "https://coupons-api.vvitovec.com"]
  });
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.headers["cf-connecting-ip"]?.toString() ?? request.ip
  });
  await app.register(registerRoutes, {
    repository: options.repository,
    adminSecret: options.adminSecret,
    allowedEmailDomain: options.allowedEmailDomain ?? "vvitovec.com",
    queue: options.queue
  });

  const adminDist = resolve(process.cwd(), "apps/admin/dist");
  if (existsSync(adminDist)) {
    await app.register(fastifyStatic, {
      root: adminDist,
      prefix: "/admin/",
      decorateReply: false
    });
    await app.register(fastifyStatic, {
      root: resolve(adminDist, "assets"),
      prefix: "/assets/",
      decorateReply: false
    });
  }

  return app;
}
