import { Hono } from "hono";
import { healthModule } from "./v1/health";

export function registerModules(app: Hono) {
  const v1 = new Hono();

  v1.route("/", healthModule());

  app.route("/v1", v1);
}
