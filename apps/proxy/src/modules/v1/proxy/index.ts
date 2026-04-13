import { OpenAPIHono } from "@hono/zod-openapi";

export default function proxyModule() {
  const app = new OpenAPIHono();

  return app;
}
