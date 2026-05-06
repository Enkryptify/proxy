import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/config/env";
import * as schema from "@/lib/schemas";

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });

let dbInitPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
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
