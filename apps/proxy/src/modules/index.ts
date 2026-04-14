import { OpenAPIHono } from "@hono/zod-openapi";
import healthModule from "./health";
import proxyModule from "./v1/proxy";

export function registerModules(app: OpenAPIHono) {
  const v1 = new OpenAPIHono();

  healthModule(v1);
  proxyModule(v1);

  app.route("/v1", v1);
}
