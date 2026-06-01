import { OpenAPIHono } from "@hono/zod-openapi";
import healthModule from "./health";
import authModule from "./v1/auth";
import adminModule from "./v1/admin";
import proxyModule from "./v1/proxy";

export function registerModules(app: OpenAPIHono) {
  healthModule(app);
  authModule(app);
  adminModule(app);
  proxyModule(app);
}
