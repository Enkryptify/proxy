import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { proxyRequestSchema, proxyParamsSchema, proxyRequestHeadersSchema, proxyResponseSchema, proxyErrorSchema } from "./proxy.schemas";
import { jsonContent, jsonBody } from "@/lib/utils/openapi";
import { collectPlaceholderKeysForLogging } from "@/lib/utils/inject";
import { safeTargetHostFromUrl } from "@/lib/utils/safeTargetHost";
import { ForbiddenError, HttpError } from "@/lib/utils/errors";
import ProxyService from "./proxy.service";
import { insertTunnelLogFailure, insertTunnelLogSuccess } from "./proxyTunnelLog";
import { assertWhitelistAllows } from "./proxyWhitelistGuard";
import { getProxyWorkspace } from "@/lib/proxyIdentity";
import { env } from "@/config/env";

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
    400: jsonContent(proxyErrorSchema, "Invalid request or target URL"),
    401: jsonContent(proxyErrorSchema, "Invalid or expired authentication token"),
    403: jsonContent(proxyErrorSchema, "Insufficient permissions or host blocked by whitelist"),
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
    if (env.DATABASE_LOGGING) {
      try {
        placeholderKeys = collectPlaceholderKeysForLogging({
          url: request.url,
          headers: request.headers,
          body: request.body,
          bodyEncoding: request.bodyEncoding,
        });
      } catch {
        if (process.env.NODE_ENV !== "test") {
          console.warn("[proxy] placeholder key extraction failed");
        }
        placeholderKeys = [];
      }
    }

    const proxyWorkspaceId = env.PROXY_KEY
      ? (await getProxyWorkspace()).workspaceId
      : workspace;

    const logBase = {
      workspace: proxyWorkspaceId,
      project,
      environmentId,
      targetHost,
      placeholderKeys,
    };

    try {
      await assertWhitelistAllows(proxyWorkspaceId, targetHost);
      const result = await service.forward(request, authorization, workspace, project, environmentId);
      const durationMs = Math.round(performance.now() - started);
      void insertTunnelLogSuccess({ ...logBase, durationMs }, result.status).catch(() => {});
      return context.json(result, 200);
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      const message = error instanceof Error ? error.message : "Unknown error";
      const statusCode = error instanceof HttpError ? error.status : 500;
      void insertTunnelLogFailure({ ...logBase, durationMs }, statusCode, message).catch(() => {});
      if (error instanceof ForbiddenError || error instanceof HttpError) throw error;
      throw error;
    }
  });
}
