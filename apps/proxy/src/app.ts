import { Hono } from "hono";
import { corsPlugin } from "./plugins/cors";
import { requestLogger } from "./lib/middleware/logger";
import { registerModules } from "./modules";

const app = new Hono();

app.use("*", corsPlugin);
app.use("*", requestLogger);

registerModules(app);

export default {
  fetch: app.fetch,
};
