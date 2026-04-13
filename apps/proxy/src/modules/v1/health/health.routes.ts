import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { healthResponseSchema } from "./health.schemas";
import HealthService from "./health.service";

const service = new HealthService();

const getHealthRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["health"],
  responses: {
    200: {
      content: { "application/json": { schema: healthResponseSchema } },
      description: "Health status",
    },
  },
});

export const healthRoutes = new OpenAPIHono();

healthRoutes.openapi(getHealthRoute, (c) => {
  return c.json(service.getStatus(), 200);
});
