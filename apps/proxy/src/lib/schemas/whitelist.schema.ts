import { baseModel, createTable } from "./general";
import { boolean, index, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Approved upstream hostnames per workspace. Combined with `workspace_settings.whitelist_mode`
 * to either soft-warn or hard-reject outbound proxy calls in `proxy.routes.ts`.
 */
export const whitelist_host = createTable(
  "whitelist_host",
  {
    ...baseModel,
    workspace: varchar("workspace", { length: 255 }).notNull(),
    /** Lowercased FQDN (no scheme, no path). Validated at the route layer. */
    hostname: varchar("hostname", { length: 255 }).notNull(),
    addedBy: varchar("added_by", { length: 255 }),
  },
  (table) => [
    uniqueIndex("whitelist_host_ws_host_unique").on(table.workspace, table.hostname),
    index("whitelist_host_ws_idx").on(table.workspace),
  ],
);

/**
 * Per-workspace settings. We use one row per workspace and upsert on toggles.
 * `whitelist_mode` defaults to false so an unconfigured workspace stays open.
 */
export const workspace_settings = createTable("workspace_settings", {
  ...baseModel,
  workspace: varchar("workspace", { length: 255 }).notNull().unique(),
  whitelistMode: boolean("whitelist_mode").notNull().default(false),
});
