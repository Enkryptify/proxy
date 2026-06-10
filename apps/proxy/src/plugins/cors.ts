import { cors } from "hono/cors";
import { env } from "@/config/env";
const adminOrigins = new Set(env.ADMIN_WEB_ORIGINS);

export const corsPlugin = cors({
  origin: (origin, c) => {
    const path = c.req.path;
    const needsCredentials = path.startsWith("/api/auth") || path.startsWith("/api/admin");
    if (needsCredentials) {
      return origin && adminOrigins.has(origin) ? origin : null;
    }
    return "*";
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type"],
});
