import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  proxyRequestSchema,
  proxyResponseSchema,
  proxyErrorSchema,
} from "./proxy.schemas";
import ProxyService from "./proxy.service";

const service = new ProxyService();

const postProxyRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["proxy"],
  request: {
    body: {
      content: { "application/json": { schema: proxyRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: proxyResponseSchema } },
      description: "Proxied response from the target endpoint",
    },
    400: {
      content: { "application/json": { schema: proxyErrorSchema } },
      description: "Invalid request",
    },
    502: {
      content: { "application/json": { schema: proxyErrorSchema } },
      description: "Target endpoint unreachable or returned an error",
    },
  },
});

export const proxyRoutes = new OpenAPIHono();

proxyRoutes.openapi(postProxyRoute, async (c) => {
  const request = c.req.valid("json");
  const result = await service.forward(request);
  return c.json(result, 200);
});
