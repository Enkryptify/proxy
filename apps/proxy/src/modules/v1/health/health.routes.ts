import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { healthResponseSchema } from "./health.schemas";
import { jsonContent } from "../../../lib/utils/openapi";
import HealthService from "./health.service";

const service = new HealthService();

const getHealthRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["health"],
  responses: {
    200: jsonContent(healthResponseSchema, "Health status"),
  },
});

export const healthRoutes = new OpenAPIHono();

healthRoutes.openapi(getHealthRoute, (c) => {
  return c.json(service.getStatus(), 200);
});
