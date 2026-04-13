import type { Hono } from "hono";
import { healthRoute } from "./health/health.route";

export function registerRoutes(app: Hono) {
  app.route("/health", healthRoute);
}
