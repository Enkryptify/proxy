import { OpenAPIHono } from "@hono/zod-openapi";
import { proxyRoutes } from "./proxy.routes";

export default function proxyModule() {
  const app = new OpenAPIHono();

  app.route("/", proxyRoutes);

  return app;
}
