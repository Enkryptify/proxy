import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { healthResponseSchema } from "./health.schemas";
import { jsonContent } from "../../lib/utils/openapi";
import HealthService from "./health.service";

const getHealthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["health"],
  responses: {
    200: jsonContent(healthResponseSchema, "Health status"),
  },
});

export function registerHealthRoutes(app: OpenAPIHono, service: HealthService) {
  app.openapi(getHealthRoute, (c) => {
    return c.json(service.getStatus(), 200);
  });
}
