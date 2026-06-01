import { OpenAPIHono } from "@hono/zod-openapi";
import healthModule from "./health";
import authModule from "./v1/auth";
import proxyModule from "./v1/proxy";

export function registerModules(app: OpenAPIHono) {
  healthModule(app);
  authModule(app);
  proxyModule(app);
}
