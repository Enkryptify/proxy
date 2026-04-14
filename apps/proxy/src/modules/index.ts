import { OpenAPIHono } from "@hono/zod-openapi";
import healthModule from "./v1/health";
import proxyModule from "./v1/proxy";

export function registerModules(app: OpenAPIHono) {
  app.route("/health", healthModule(app));
  app.route("/proxy", proxyModule(app));

  app.route("/v1", app);
}
