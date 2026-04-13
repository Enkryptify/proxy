import { OpenAPIHono } from "@hono/zod-openapi";
import { healthRoutes } from "./health.routes";

export default function healthModule() {
  const app = new OpenAPIHono();

  app.route("/", healthRoutes);

  return app;
}
