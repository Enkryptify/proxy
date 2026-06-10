import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { jsonBody, jsonContent } from "@/lib/utils/openapi";
import { requireAdmin } from "@/lib/middleware/requireAdmin";
import { getProxyWorkspace } from "@/lib/proxyIdentity";
import {
  adminErrorSchema,
  logsQuerySchema,
  logsResponseSchema,
  settingsResponseSchema,
  settingsUpdateBodySchema,
  statsQuerySchema,
  statsResponseSchema,
  whitelistCreateBodySchema,
  whitelistEntrySchema,
  whitelistIdParamsSchema,
  whitelistListResponseSchema,
  workspaceIdentityResponseSchema,
} from "./admin.schemas";
import type AdminService from "./admin.service";

const workspaceIdentityRoute = createRoute({
  method: "get",
  path: "/api/admin/me/workspace",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonContent(workspaceIdentityResponseSchema, "Workspace this proxy is bound to"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    502: jsonContent(adminErrorSchema, "Vault unreachable or PROXY_KEY invalid"),
  },
});

const statsRoute = createRoute({
  method: "get",
  path: "/api/admin/stats",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: { query: statsQuerySchema },
  responses: {
    200: jsonContent(statsResponseSchema, "Aggregated proxy stats"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    502: jsonContent(adminErrorSchema, "Database unavailable or PROXY_KEY invalid"),
  },
});

const logsRoute = createRoute({
  method: "get",
  path: "/api/admin/logs",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: { query: logsQuerySchema },
  responses: {
    200: jsonContent(logsResponseSchema, "Paginated tunnel logs"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    502: jsonContent(adminErrorSchema, "PROXY_KEY invalid or vault unreachable"),
  },
});

const whitelistListRoute = createRoute({
  method: "get",
  path: "/api/admin/whitelist",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonContent(whitelistListResponseSchema, "Whitelist for this proxy's workspace"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    502: jsonContent(adminErrorSchema, "PROXY_KEY invalid or vault unreachable"),
  },
});

const whitelistCreateRoute = createRoute({
  method: "post",
  path: "/api/admin/whitelist",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: { body: jsonBody(whitelistCreateBodySchema) },
  responses: {
    201: jsonContent(whitelistEntrySchema, "Whitelist entry created"),
    400: jsonContent(adminErrorSchema, "Invalid hostname"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    502: jsonContent(adminErrorSchema, "PROXY_KEY invalid or vault unreachable"),
  },
});

const whitelistDeleteRoute = createRoute({
  method: "delete",
  path: "/api/admin/whitelist/{id}",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: { params: whitelistIdParamsSchema },
  responses: {
    200: jsonContent(z.object({ ok: z.literal(true) }), "Whitelist entry deleted"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    404: jsonContent(adminErrorSchema, "Not found"),
  },
});

const settingsGetRoute = createRoute({
  method: "get",
  path: "/api/admin/settings",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonContent(settingsResponseSchema, "Workspace settings"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    502: jsonContent(adminErrorSchema, "PROXY_KEY invalid or vault unreachable"),
  },
});

const settingsUpdateRoute = createRoute({
  method: "patch",
  path: "/api/admin/settings",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: { body: jsonBody(settingsUpdateBodySchema) },
  responses: {
    200: jsonContent(settingsResponseSchema, "Workspace settings updated"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
    502: jsonContent(adminErrorSchema, "PROXY_KEY invalid or vault unreachable"),
  },
});

export function registerAdminRoutes(app: OpenAPIHono, service: AdminService) {
  app.use("/api/admin/*", requireAdmin);

  app.openapi(workspaceIdentityRoute, async (c) => {
    const identity = await getProxyWorkspace();
    return c.json(identity, 200);
  });

  app.openapi(statsRoute, async (c) => {
    const { windowHours } = c.req.valid("query");
    const { workspaceId } = await getProxyWorkspace();
    return c.json(await service.getStats({ windowHours, workspace: workspaceId }), 200);
  });

  app.openapi(logsRoute, async (c) => {
    const { page, pageSize } = c.req.valid("query");
    const { workspaceId } = await getProxyWorkspace();
    return c.json(await service.listLogs({ page, pageSize, workspace: workspaceId }), 200);
  });

  app.openapi(whitelistListRoute, async (c) => {
    const { workspaceId } = await getProxyWorkspace();
    return c.json(await service.listWhitelist(workspaceId), 200);
  });

  app.openapi(whitelistCreateRoute, async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const { workspaceId } = await getProxyWorkspace();
    const created = await service.addWhitelist({
      workspace: workspaceId,
      hostname: body.hostname,
      addedBy: user.email,
    });
    return c.json(created, 201);
  });

  app.openapi(whitelistDeleteRoute, async (c) => {
    const { id } = c.req.valid("param");
    await service.removeWhitelist(id);
    return c.json({ ok: true as const }, 200);
  });

  app.openapi(settingsGetRoute, async (c) => {
    const { workspaceId } = await getProxyWorkspace();
    return c.json(await service.getSettings(workspaceId), 200);
  });

  app.openapi(settingsUpdateRoute, async (c) => {
    const { whitelistMode } = c.req.valid("json");
    const { workspaceId } = await getProxyWorkspace();
    return c.json(await service.updateSettings(workspaceId, whitelistMode), 200);
  });
}
