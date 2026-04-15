import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { proxyRequestSchema, proxyParamsSchema, proxyRequestHeadersSchema, proxyResponseSchema, proxyErrorSchema } from "./proxy.schemas";
import { jsonContent, jsonBody } from "@/lib/utils/openapi";
import ProxyService from "./proxy.service";

const postProxyRoute = createRoute({
  method: "post",
  path: "/proxy/{workspace}/{project}/{environmentId}",
  tags: ["proxy"],
  request: {
    params: proxyParamsSchema,
    headers: proxyRequestHeadersSchema,
    body: jsonBody(proxyRequestSchema),
  },
  responses: {
    200: jsonContent(proxyResponseSchema, "Proxied response from the target endpoint"),
    400: jsonContent(proxyErrorSchema, "Invalid request or target URL"),
    401: jsonContent(proxyErrorSchema, "Invalid or expired authentication token"),
    403: jsonContent(proxyErrorSchema, "Insufficient permissions"),
    404: jsonContent(proxyErrorSchema, "Workspace, project, or environment not found in Enkryptify"),
    429: jsonContent(proxyErrorSchema, "Rate limited"),
    502: jsonContent(proxyErrorSchema, "Target endpoint unreachable or secret provider unavailable"),
  },
});

export function registerProxyRoutes(app: OpenAPIHono, service: ProxyService) {
  app.openapi(postProxyRoute, async (context) => {
    const { authorization } = context.req.valid("header");
    const { workspace, project, environmentId } = context.req.valid("param");
    const request = context.req.valid("json");

    const result = await service.forward(request, authorization, workspace, project, environmentId);
    return context.json(result, 200);
  });
}
