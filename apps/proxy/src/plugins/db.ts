import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/config/env";
import { logger } from "@/lib/utils/logger";
import * as schema from "@/lib/schemas";

const client = env.DATABASE_URL ? postgres(env.DATABASE_URL) : null;

export const db: PostgresJsDatabase<typeof schema> | null = client
  ? drizzle(client, { schema })
  : null;

let dbInitPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!client || !db) {
    if (!env.DATABASE_URL) {
      logger.debug("[db] DATABASE_URL not set — skipping database init");
    }
    return;
  }

  if (!dbInitPromise) {
    dbInitPromise = client`select 1`
      .then(async () => {
        if (!env.DATABASE_MIGRATE_ON_START) {
          logger.info("[db] DATABASE_MIGRATE_ON_START=false — skipping migrations");
          return;
        }

        const migrationsFolder = path.resolve(process.cwd(), "drizzle");
        if (!fs.existsSync(migrationsFolder)) {
          logger.error(
            `[db] migrations folder not found at ${migrationsFolder} (cwd=${process.cwd()}) — cannot migrate`,
          );
          return;
        }

        logger.info(`[db] running migrations from ${migrationsFolder}`);
        await migrate(db, { migrationsFolder });
        logger.info("[db] migrations complete");
      })
      .catch((err) => {
        dbInitPromise = null;
        logger.error("[db] database init failed", { err });
        throw err;
      });
  }

  await dbInitPromise;
}
