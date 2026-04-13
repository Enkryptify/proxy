import { z } from "@hono/zod-openapi";

export const proxyRequestSchema = z.object({
  url: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z.unknown().optional(),
  config: z.object({
    workspace: z.string(),
    project: z.string(),
    "environment-id": z.uuid(),
  }),
});

export const proxyResponseSchema = z.object({
  status: z.number(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
});

export const proxyErrorSchema = z.object({
  error: z.string(),
});

export type ProxyRequest = z.infer<typeof proxyRequestSchema>;
