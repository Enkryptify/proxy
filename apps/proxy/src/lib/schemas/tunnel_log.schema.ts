import { baseModel, createTable } from "./general";
import { integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core";

export const tunnel_log = createTable("tunnel_log", {
    ...baseModel,
    logId: uuid("log_id").notNull().unique(),
    workspace: varchar("workspace", { length: 255 }).notNull(),
    project: varchar("project", { length: 255 }).notNull(),
    environmentId: uuid("environment_id").notNull(),
    link: varchar("link", { length: 255 }).notNull(),
    statusCode: integer("status_code").notNull(),
    outcome: varchar("outcome", { length: 255 }).notNull(),
    errorMessage: varchar("error_message", { length: 255 }),
    durationMs: integer("duration_ms").notNull(),
    placeholderKeys: jsonb("placeholder_keys")
});