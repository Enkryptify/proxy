import { app, initAppWithDb } from "./app";
import { env } from "@/config/env";

let initPromise: Promise<void> | undefined;

/**
 * Single entry for local Bun (`bun run --hot src/index.ts`),
 * Docker (`bun run dist/index.js`), and Vercel (bundled to api/index.js).
 *
 * Lazy DB init avoids top-level `await` so the module loads cleanly on
 * Vercel's serverless cold start.
 */
export default {
  port: env.PORT,
  async fetch(request: Request) {
    initPromise ??= initAppWithDb();
    await initPromise;
    return app.fetch(request);
  },
};
