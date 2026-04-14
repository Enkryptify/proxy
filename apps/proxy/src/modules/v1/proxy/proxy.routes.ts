import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import {
  proxyRequestSchema,
  proxyParamsSchema,
  proxyRequestHeadersSchema,
  proxyResponseSchema,
  proxyErrorSchema,
} from "./proxy.schemas";
import { jsonContent, jsonBody } from "@/lib/utils/openapi";
import ProxyService from "./proxy.service";
const postProxyRoute = createRoute({
  method: "post",
  path: "/{workspace}/{project}/{environmentId}",
  tags: ["proxy"],
  request: {
    params: proxyParamsSchema,
    headers: proxyRequestHeadersSchema,
    body: jsonBody(proxyRequestSchema),
  },
  responses: {
    200: jsonContent(proxyResponseSchema, "Proxied response from the target endpoint"),
    400: jsonContent(proxyErrorSchema, "Invalid request"),
    502: jsonContent(proxyErrorSchema, "Target endpoint unreachable or returned an error"),
  },
});

export function registerProxyRoutes(app: OpenAPIHono, service: ProxyService) {
  app.openapi(postProxyRoute, async (c) => {
    const { authorization } = c.req.valid("header");
    const { workspace, project, environmentId } = c.req.valid("param");
    const request = c.req.valid("json");

    try {
      const result = await service.forward(request);
      return c.json(result, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Proxy forward failed: ${message}`);
      return c.json({ error: `Failed to reach target: ${message}` }, 502);
    }
  });
}