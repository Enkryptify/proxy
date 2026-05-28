import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/config/env";
import * as schema from "@/lib/schemas";

const client = env.DATABASE_URL ? postgres(env.DATABASE_URL) : null;

export const db: PostgresJsDatabase<typeof schema> | null = client
  ? drizzle(client, { schema })
  : null;

let dbInitPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!client || !db) {
    return;
  }

  if (!dbInitPromise) {
    dbInitPromise = client`select 1`
      .then(async () => {
        if (!env.DATABASE_MIGRATE_ON_START) {
          return;
        }

        const migrationsFolder = path.resolve(process.cwd(), "drizzle");
        if (!fs.existsSync(migrationsFolder)) {
          console.warn(`[db] migrations folder not found at ${migrationsFolder}, skipping migrate`);
          return;
        }

        await migrate(db, { migrationsFolder });
      })
      .catch((err) => {
        dbInitPromise = null;
        throw err;
      });
  }

  await dbInitPromise;
}
