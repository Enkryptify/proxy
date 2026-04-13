import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env";

export default defineConfig({
  schema: "./src/lib/schemas/db.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
