import { OpenAPIHono } from "@hono/zod-openapi";
import healthModule from "./health";
import proxyModule from "./v1/proxy";

export function registerModules(app: OpenAPIHono) {
  healthModule(app);
  proxyModule(app);
}
