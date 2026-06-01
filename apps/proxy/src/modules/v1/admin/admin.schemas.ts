import { z } from "@hono/zod-openapi";

export const adminErrorSchema = z.object({ error: z.string() });

// ---------- Proxy identity ----------

/** Identity of the workspace this proxy is bound to (resolved from PROXY_KEY). */
export const workspaceIdentityResponseSchema = z.object({
  workspaceId: z.string(),
  workspaceName: z.string(),
});

// ---------- Stats ----------

export const statsQuerySchema = z.object({
  /** Window in hours over which to aggregate. Default 24h. */
  windowHours: z
    .coerce
    .number()
    .int()
    .positive()
    .max(24 * 30)
    .default(24)
    .openapi({ param: { name: "windowHours", in: "query" } }),
});

export const statsResponseSchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  avgDurationMs: z.number().nonnegative(),
  p95DurationMs: z.number().nonnegative(),
  windowHours: z.number().int().positive(),
  generatedAt: z.string(),
});

// ---------- Logs ----------

export const logsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).openapi({ param: { name: "page", in: "query" } }),
  pageSize: z.coerce.number().int().positive().max(200).default(25).openapi({ param: { name: "pageSize", in: "query" } }),
});

export const logEntrySchema = z.object({
  id: z.uuid(),
  createdAt: z.string(),
  workspace: z.string(),
  project: z.string(),
  environmentId: z.uuid(),
  targetHost: z.string(),
  statusCode: z.number().int(),
  outcome: z.enum(["success", "failure"]),
  durationMs: z.number().int().nonnegative(),
  placeholderKeys: z.array(z.string()),
});

export const logsResponseSchema = z.object({
  items: z.array(logEntrySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

// ---------- Whitelist ----------

/** RFC 1123-style labels: alphanumeric ends, hyphens only in the middle (input is lowercased). */
const HOSTNAME_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const whitelistEntrySchema = z.object({
  id: z.uuid(),
  workspace: z.string(),
  hostname: z.string(),
  addedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const whitelistListResponseSchema = z.object({
  items: z.array(whitelistEntrySchema),
  whitelistMode: z.boolean(),
});

export const whitelistCreateBodySchema = z.object({
  hostname: z
    .string()
    .min(1)
    .max(253)
    .transform((v) => v.trim().toLowerCase())
    .refine((v) => HOSTNAME_RE.test(v), { message: "Invalid hostname" }),
});

export const whitelistIdParamsSchema = z.object({
  id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

// ---------- Settings ----------

export const settingsResponseSchema = z.object({
  workspace: z.string(),
  whitelistMode: z.boolean(),
});

export const settingsUpdateBodySchema = z.object({
  whitelistMode: z.boolean(),
});

export type StatsResponse = z.infer<typeof statsResponseSchema>;
export type LogsResponse = z.infer<typeof logsResponseSchema>;
export type WhitelistEntry = z.infer<typeof whitelistEntrySchema>;
export type SettingsResponse = z.infer<typeof settingsResponseSchema>;
export type WorkspaceIdentityResponse = z.infer<typeof workspaceIdentityResponseSchema>;
