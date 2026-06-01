import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { jsonBody, jsonContent } from "@/lib/utils/openapi";
import { requireAdmin } from "@/lib/middleware/requireAdmin";
import {
  adminErrorSchema,
  logsQuerySchema,
  logsResponseSchema,
  settingsParamsSchema,
  settingsResponseSchema,
  settingsUpdateBodySchema,
  statsQuerySchema,
  statsResponseSchema,
  whitelistCreateBodySchema,
  whitelistEntrySchema,
  whitelistIdParamsSchema,
  whitelistListResponseSchema,
  workspaceQuerySchema,
} from "./admin.schemas";
import type AdminService from "./admin.service";

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
    502: jsonContent(adminErrorSchema, "Database unavailable"),
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
  },
});

const whitelistListRoute = createRoute({
  method: "get",
  path: "/api/admin/whitelist",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: { query: workspaceQuerySchema },
  responses: {
    200: jsonContent(whitelistListResponseSchema, "Whitelist for workspace"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
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
  path: "/api/admin/settings/{workspace}",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: { params: settingsParamsSchema },
  responses: {
    200: jsonContent(settingsResponseSchema, "Workspace settings"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
  },
});

const settingsUpdateRoute = createRoute({
  method: "patch",
  path: "/api/admin/settings/{workspace}",
  tags: ["admin"],
  security: [{ bearerAuth: [] }],
  request: {
    params: settingsParamsSchema,
    body: jsonBody(settingsUpdateBodySchema),
  },
  responses: {
    200: jsonContent(settingsResponseSchema, "Workspace settings updated"),
    401: jsonContent(adminErrorSchema, "Not authenticated"),
    403: jsonContent(adminErrorSchema, "Admin role required"),
  },
});

export function registerAdminRoutes(app: OpenAPIHono, service: AdminService) {
  app.use("/api/admin/*", requireAdmin);

  app.openapi(statsRoute, async (c) => {
    const q = c.req.valid("query");
    return c.json(await service.getStats(q), 200);
  });

  app.openapi(logsRoute, async (c) => {
    const q = c.req.valid("query");
    return c.json(await service.listLogs(q), 200);
  });

  app.openapi(whitelistListRoute, async (c) => {
    const { workspace } = c.req.valid("query");
    return c.json(await service.listWhitelist(workspace), 200);
  });

  app.openapi(whitelistCreateRoute, async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const created = await service.addWhitelist({
      workspace: body.workspace,
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
    const { workspace } = c.req.valid("param");
    return c.json(await service.getSettings(workspace), 200);
  });

  app.openapi(settingsUpdateRoute, async (c) => {
    const { workspace } = c.req.valid("param");
    const { whitelistMode } = c.req.valid("json");
    return c.json(await service.updateSettings(workspace, whitelistMode), 200);
  });
}
