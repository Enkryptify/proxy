import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { proxyRequestSchema, proxyParamsSchema, proxyRequestHeadersSchema, proxyResponseSchema, proxyErrorSchema } from "./proxy.schemas";
import { jsonContent, jsonBody } from "@/lib/utils/openapi";
import { collectPlaceholderKeysForLogging } from "@/lib/utils/inject";
import { safeTargetHostFromUrl } from "@/lib/utils/safeTargetHost";
import { HttpError } from "@/lib/utils/errors";
import ProxyService from "./proxy.service";
import { insertTunnelLogFailure, insertTunnelLogSuccess } from "./proxyTunnelLog";

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

    const started = performance.now();
    const targetHost = safeTargetHostFromUrl(request.url);

    let placeholderKeys: string[] = [];
    try {
      placeholderKeys = collectPlaceholderKeysForLogging({
        url: request.url,
        headers: request.headers,
        body: request.body,
        bodyEncoding: request.bodyEncoding,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[proxy] placeholder key extraction failed", {
          route: "POST /proxy/{workspace}/{project}/{environmentId}",
          url: request.url,
          error,
        });
      }
      placeholderKeys = [];
    }

    const logBase = {
      workspace,
      project,
      environmentId,
      targetHost,
      placeholderKeys,
    };

    try {
      const result = await service.forward(request, authorization, workspace, project, environmentId);
      const durationMs = Math.round(performance.now() - started);
      await insertTunnelLogSuccess({ ...logBase, durationMs }, result.status);
      return context.json(result, 200);
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = error instanceof HttpError ? error.status : 500;
      await insertTunnelLogFailure({ ...logBase, durationMs }, statusCode, message);
      throw error;
    }
  });
}
