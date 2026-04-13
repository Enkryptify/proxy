import { OpenAPIHono } from "@hono/zod-openapi";
import { getHealthRoute } from "./health.routes";
import HealthService from "./health.service";

const service = new HealthService();

export default function healthModule(app: OpenAPIHono) {

  app.openapi(getHealthRoute, (c) => {
    return c.json(service.getStatus(), 200);
  });

  return app;
}
