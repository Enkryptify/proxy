import { Hono } from "hono";
import { corsPlugin } from "./plugins/cors";
import { requestLogger } from "./lib/middleware/logger";
import { registerRoutes } from "./modules";

const app = new Hono();

app.use("*", corsPlugin);
app.use("*", requestLogger);

registerRoutes(app);

export default {
  fetch: app.fetch,
};
