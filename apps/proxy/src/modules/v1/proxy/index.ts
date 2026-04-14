import type { OpenAPIHono } from "@hono/zod-openapi";
import { proxyRoutes } from "./proxy.routes";

export default function proxyModule(app: OpenAPIHono) {
  app.route("/proxy", proxyRoutes);
}
