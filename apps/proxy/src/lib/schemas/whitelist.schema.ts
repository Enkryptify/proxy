import { baseModel, createTable } from "./general";
import { boolean, index, uniqueIndex, varchar } from "drizzle-orm/pg-core";

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

export const workspace_settings = createTable("workspace_settings", {
  ...baseModel,
  workspace: varchar("workspace", { length: 255 }).notNull().unique(),
  whitelistMode: boolean("whitelist_mode").notNull().default(false),
});
