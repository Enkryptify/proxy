import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "@/lib/schemas";

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });

let dbInitPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = client`select 1`
      .then(() => undefined)
      .catch((err) => {
        dbInitPromise = null;
        throw err;
      });
  }

  await dbInitPromise;
}
