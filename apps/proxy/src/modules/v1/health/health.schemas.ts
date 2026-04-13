import { z } from "@hono/zod-openapi";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  timestamp: z.string(),
});
