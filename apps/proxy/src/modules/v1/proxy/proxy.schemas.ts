import { z } from "@hono/zod-openapi";

export const proxyRequestSchema = z.object({
  url: z.url().refine(
    (u) => u.startsWith("http://") || u.startsWith("https://"),
    { message: "URL must use http:// or https://" },
  ),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z.json().optional()
});

export const proxyResponseSchema = z.object({
  status: z.number(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
});

export const proxyErrorSchema = z.object({
  error: z.string(),
});

export const proxyParamsSchema = z.object({
  workspace: z.string().min(1).openapi({ param: { name: "workspace", in: "path" } }),
  project: z.string().min(1).openapi({ param: { name: "project", in: "path" } }),
  environmentId: z.uuid().openapi({ param: { name: "environmentId", in: "path" } }),
});

export const proxyRequestHeadersSchema = z.object({
  authorization: z.string().regex(/^[Bb]earer \S+$/, { message: "Must be a valid Bearer token" }),
});

/** Input to secret placeholder resolution (proxy body + path + auth). */
export const injectParamsSchema = proxyRequestSchema
  .pick({ url: true, headers: true, body: true })
  .merge(proxyParamsSchema)
  .extend({
    authorization: proxyRequestHeadersSchema.shape.authorization,
  });

/** Output after `%KEY%` → secret substitution. */
export const injectResultSchema = z.object({
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
});

export type ProxyError = z.infer<typeof proxyErrorSchema>;
export type ProxyResponse = z.infer<typeof proxyResponseSchema>;
export type ProxyRequest = z.infer<typeof proxyRequestSchema>;
export type InjectParams = z.infer<typeof injectParamsSchema>;
export type InjectResult = z.infer<typeof injectResultSchema>;
