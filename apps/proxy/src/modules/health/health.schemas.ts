import { z } from "@hono/zod-openapi";

export const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  runtime: z.string(),
});
