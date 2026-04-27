import { Worker } from "bullmq";
import IORedis from "ioredis";
import { loadApiEnv } from "@trust-coupons/config";
import { PostgresRepository } from "../db/postgres.js";
import { handleJob } from "./handlers.js";
import { queueName } from "./queue.js";

const env = loadApiEnv();
const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
const repository = PostgresRepository.fromConnectionString(env.DATABASE_URL);

const worker = new Worker(queueName, (job) => handleJob(job, repository), { connection });

worker.on("completed", (job) => {
  console.log(JSON.stringify({ level: "info", event: "job_completed", jobName: job.name, jobId: job.id }));
});

worker.on("failed", (job, error) => {
  console.error(JSON.stringify({ level: "error", event: "job_failed", jobName: job?.name, jobId: job?.id, error: error.message }));
});

console.log(JSON.stringify({ level: "info", event: "worker_started", queueName }));
