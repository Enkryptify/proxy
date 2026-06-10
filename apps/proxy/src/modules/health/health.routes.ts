import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { healthResponseSchema } from "./health.schemas";
import { jsonContent } from "@/lib/utils/openapi";
import HealthService from "./health.service";

const getHealthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["health"],
  responses: {
    200: jsonContent(healthResponseSchema, "Health status"),
  },
});

const getApiHealthRoute = createRoute({
  method: "get",
  path: "/api/health",
  tags: ["health"],
  responses: {
    200: jsonContent(healthResponseSchema, "Health status (admin-panel alias)"),
  },
});

export function registerHealthRoutes(app: OpenAPIHono, service: HealthService) {
  app.openapi(getHealthRoute, (c) => c.json(service.getStatus(), 200));
  app.openapi(getApiHealthRoute, (c) => c.json(service.getStatus(), 200));
}
