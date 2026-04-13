import { baseModel, createTable } from "./general";
import { varchar, uuid, boolean, timestamp, text } from "drizzle-orm/pg-core";

export const user = createTable("user", {
    ...baseModel,
    userId: uuid("user_id").notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    password: varchar("password", { length: 255 }).notNull(),
});

export const refreshToken = createTable("refresh_token", {
    ...baseModel,
    userId: uuid("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRevoked: boolean("is_revoked").notNull().default(false),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
});

export const tokenBlocklist = createTable("token_blocklist", {
    ...baseModel,
    jti: varchar("jti", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});