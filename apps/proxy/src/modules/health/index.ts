import type { OpenAPIHono } from "@hono/zod-openapi";
import { registerHealthRoutes } from "./health.routes";
import HealthService from "./health.service";

const service = new HealthService();

export default function healthModule(app: OpenAPIHono) {
  registerHealthRoutes(app, service);
}
