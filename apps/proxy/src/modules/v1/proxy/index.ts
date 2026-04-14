import type { OpenAPIHono } from "@hono/zod-openapi";
import { registerProxyRoutes } from "./proxy.routes";
import ProxyService from "./proxy.service";

const service = new ProxyService();

export default function proxyModule(app: OpenAPIHono) {
  registerProxyRoutes(app, service);
}
