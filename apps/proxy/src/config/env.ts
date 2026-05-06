import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z
      .string()
      .transform((value) => parseInt(value, 10))
      .pipe(z.number()),
    DATABASE_URL: z.string(),
    DATABASE_LOGGING: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    DATABASE_MIGRATE_ON_START: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
