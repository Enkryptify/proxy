import { createRoute } from "@hono/zod-openapi";
import { healthResponseSchema } from "./health.schemas";

export const getHealthRoute = createRoute({
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
