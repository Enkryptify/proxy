import { OpenAPIHono } from "@hono/zod-openapi";
import healthModule from "./v1/health";
import proxyModule from "./v1/proxy";

export function registerModules(app: OpenAPIHono) {
  const v1 = new OpenAPIHono();

  v1.route("/health", healthModule());
  v1.route("/proxy", proxyModule());

  app.route("/v1", v1);
}
