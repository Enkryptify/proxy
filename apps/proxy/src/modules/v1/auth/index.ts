import type { OpenAPIHono } from "@hono/zod-openapi";
import { registerAuthRoutes } from "./auth.routes";
import AuthService from "./auth.service";

const service = new AuthService();

export default function authModule(app: OpenAPIHono) {
  registerAuthRoutes(app, service);
}
