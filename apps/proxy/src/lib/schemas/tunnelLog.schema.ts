import { baseModel, createTable } from "./general"; 
import { index, integer, jsonb, text, uuid, varchar } from "drizzle-orm/pg-core";

export const tunnel_log = createTable("tunnel_log", {
  ...baseModel,
  logId: uuid("log_id").notNull().unique(),
  /** Stable workspace identifier from the Enkryptify vault (see `PROXY_KEY`). */
  workspaceId: varchar("workspace_id", { length: 255 }).notNull(),
  project: varchar("project", { length: 255 }).notNull(),
  environmentId: uuid("environment_id").notNull(),
  /** Hostname only (e.g. api.example.com) — never full URLs with paths or query strings (secrets). */
  link: varchar("link", { length: 255 }).notNull(),
  /** Upstream HTTP status when the proxy call completes; on failure, the HTTP status returned to the client. */
  statusCode: integer("status_code").notNull(),
  outcome: varchar("outcome", { length: 64 }).notNull(),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").notNull(),
  /** Names of `%PLACEHOLDER%` keys referenced (never values). */
  placeholderKeys: jsonb("placeholder_keys").$type<string[]>(),
}, (table) => [
  index("tunnel_log_ws_proj_env_created_at_idx").on(
    table.workspaceId,
    table.project,
    table.environmentId,
    table.createdAt,
  ),
  index("tunnel_log_ws_env_created_at_idx").on(
    table.workspaceId,
    table.environmentId,
    table.createdAt,
  ),
  index("tunnel_log_ws_proj_env_status_created_at_idx").on(
    table.workspaceId,
    table.project,
    table.environmentId,
    table.statusCode,
    table.createdAt,
  ),
]);