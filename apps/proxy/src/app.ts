import { OpenAPIHono } from "@hono/zod-openapi";
import { corsPlugin } from "./plugins/cors";
import { requestLogger } from "./lib/middleware/logger";
import { errorHandler } from "./lib/middleware/errorHandler";
import { registerModules } from "./modules";
import { initDb } from "./plugins/db";

const app = new OpenAPIHono();

app.use("*", corsPlugin);
app.use("*", requestLogger);
app.onError(errorHandler);

registerModules(app);

await initDb();

export { app };
export default {
  fetch: app.fetch,
};
