import { Queue } from "bullmq";
import IORedis from "ioredis";

export const queueName = "trust-coupons";

export function createQueue(redisUrl: string) {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  return new Queue(queueName, { connection });
}
