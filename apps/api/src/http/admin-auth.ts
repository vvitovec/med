import type { FastifyReply, FastifyRequest } from "fastify";

export function createAdminGuard(options: {
  adminSecret?: string | undefined;
  allowedEmailDomain: string;
}) {
  return async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
    const cfEmail = request.headers["cf-access-authenticated-user-email"];
    if (typeof cfEmail === "string" && cfEmail.toLowerCase().endsWith(`@${options.allowedEmailDomain.toLowerCase()}`)) {
      return;
    }

    const token = request.headers["x-admin-token"];
    if (options.adminSecret && token === options.adminSecret) {
      return;
    }

    reply.code(401).send({
      error: "admin_auth_required",
      message: "Admin routes require Cloudflare Access or the configured server-side admin token."
    });
  };
}
