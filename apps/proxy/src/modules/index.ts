import { OpenAPIHono } from "@hono/zod-openapi";
import healthModule from "./v1/health";

export function registerModules(app: OpenAPIHono) {
  const v1 = new OpenAPIHono();

  v1.route("/health", healthModule(v1));

  app.route("/v1", v1);
}
