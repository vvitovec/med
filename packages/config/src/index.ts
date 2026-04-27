import { z } from "zod";

export const PUBLIC_PRODUCTION_API_BASE_URL = "https://coupons-api.vvitovec.com";
export const LOCAL_API_BASE_URL = "http://localhost:3100";

export const ApiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(3100),
  PUBLIC_API_BASE_URL: z.string().url().default(LOCAL_API_BASE_URL),
  PRODUCTION_API_BASE_URL: z.string().url().default(PUBLIC_PRODUCTION_API_BASE_URL),
  DATABASE_URL: z.string().min(1),
  ADMIN_DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6380"),
  ADMIN_SESSION_SECRET: z.string().min(32).optional(),
  ADMIN_ACCESS_EMAIL_DOMAIN: z.string().default("vvitovec.com"),
  CLOUDFLARE_ACCESS_JWT_AUD: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("trust-coupons"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional()
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return ApiEnvSchema.parse(source);
}

export function extensionApiBaseUrl(env: Record<string, string | undefined>): string {
  return env.VITE_API_BASE_URL || LOCAL_API_BASE_URL;
}
