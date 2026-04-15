import { OpenAPIHono } from "@hono/zod-openapi";
import { corsPlugin } from "./plugins/cors";
import { requestLogger } from "./lib/middleware/logger";
import { errorHandler } from "./lib/middleware/errorHandler";
import { registerModules } from "./modules";

const app = new OpenAPIHono();

app.use("*", corsPlugin);
app.use("*", requestLogger);
app.onError(errorHandler);

registerModules(app);

export { app };
export default {
  fetch: app.fetch,
};
