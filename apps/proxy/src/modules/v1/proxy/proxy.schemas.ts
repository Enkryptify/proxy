import { z } from "@hono/zod-openapi";

function isStrictBase64String(body: string): boolean {
  const s = body.replace(/\s+/g, "");
  if (s.length === 0) return true;
  if (s.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
  const withoutPadding = s.replace(/=+$/, "");
  if (/=/.test(withoutPadding)) return false;
  const buf = Buffer.from(s, "base64");
  return buf.toString("base64") === s;
}

const proxyRequestBaseSchema = z.object({
  url: z.url().refine(
    (u) => u.startsWith("http://") || u.startsWith("https://"),
    { message: "URL must use http:// or https://" },
  ),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z
    .unknown()
    .optional()
    .openapi({
      description:
        "Forwarded as the upstream request body. Use a string for raw payloads (XML, plain text, preformatted data). Objects and arrays are JSON-encoded; set Content-Type on the request or the proxy adds application/json when missing for non-string bodies.",
    }),
  /** When set, `body` is base64-decoded to raw bytes before upload (S3, etc.). Secret placeholders are not applied to the body. */
  bodyEncoding: z.enum(["base64"]).optional(),
});

export const proxyRequestSchema = proxyRequestBaseSchema.superRefine((data, ctx) => {
  if (data.bodyEncoding !== "base64") return;

  if (typeof data.body !== "string") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["body"],
      message: 'bodyEncoding "base64" requires body to be a base64 string',
    });
    return;
  }

  if (!isStrictBase64String(data.body)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["body"],
      message: "Invalid base64 body",
    });
  }
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
export const injectParamsSchema = proxyRequestBaseSchema
  .pick({ url: true, headers: true, body: true, bodyEncoding: true })
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
