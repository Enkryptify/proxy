import type { OpenAPIHono } from "@hono/zod-openapi";
import { registerAdminRoutes } from "./admin.routes";
import AdminService from "./admin.service";

const service = new AdminService();

export default function adminModule(app: OpenAPIHono) {
  registerAdminRoutes(app, service);
}
