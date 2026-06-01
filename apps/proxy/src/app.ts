import { OpenAPIHono } from "@hono/zod-openapi";
import { corsPlugin } from "./plugins/cors";
import { requestLogger } from "./lib/middleware/logger";
import { errorHandler } from "./lib/middleware/errorHandler";
import { registerModules } from "./modules";
import { initDb } from "./plugins/db";
import { installProxyAuthFetch } from "./lib/proxyAuthFetch";

// When PROXY_KEY is set, every fetch to the Enkryptify vault gets a
// `proxy_authentication` header injected automatically. Installed once at
// module load so the Enkryptify SDK transparently sends the header.
installProxyAuthFetch();

const app = new OpenAPIHono();

app.use("*", corsPlugin);
app.use("*", requestLogger);
app.onError(errorHandler);

registerModules(app);

let appInitPromise: Promise<void> | null = null;

export async function initAppWithDb(): Promise<void> {
  if (!appInitPromise) {
    appInitPromise = initDb().catch((err) => {
      appInitPromise = null;
      throw err;
    });
  }

  await appInitPromise;
}

export { app };
