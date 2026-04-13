import { Hono } from "hono";
import { healthRoute } from "./health.route";

export function healthModule() {
  const module = new Hono();

  module.route("/health", healthRoute);

  return module;
}
