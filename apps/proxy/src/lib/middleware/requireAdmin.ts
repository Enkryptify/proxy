import type { MiddlewareHandler } from "hono";
import type { AccessTokenPayload } from "@/lib/utils/tokens";
import { verifyAccessToken } from "@/lib/utils/tokens";
import { ForbiddenError, UnauthorizedError } from "@/lib/utils/errors";

declare module "hono" {
  interface ContextVariableMap {
    user: AccessTokenPayload;
  }
}

const BEARER_RE = /^[Bb]earer\s+(\S+)$/;

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("authorization");
  if (!header) throw new UnauthorizedError("Missing Authorization header");
  const match = BEARER_RE.exec(header);
  if (!match) throw new UnauthorizedError("Malformed Authorization header");

  const payload = await verifyAccessToken(match[1]!);
  if (payload.role !== "admin") {
    throw new ForbiddenError("Admin role required");
  }

  c.set("user", payload);
  await next();
};
