import { loadApiEnv } from "@trust-coupons/config";
import { buildApp } from "./app.js";
import { PostgresRepository } from "./db/postgres.js";
import { createQueue } from "./worker/queue.js";

const env = loadApiEnv();
const repository = PostgresRepository.fromConnectionString(env.DATABASE_URL);
const queue = createQueue(env.REDIS_URL);
const app = await buildApp({
  repository,
  queue,
  adminSecret: env.ADMIN_SESSION_SECRET,
  allowedEmailDomain: env.ADMIN_ACCESS_EMAIL_DOMAIN
});

await app.listen({ host: env.API_HOST, port: env.API_PORT });
