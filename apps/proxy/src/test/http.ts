import type { OpenAPIHono } from "@hono/zod-openapi";

const TEST_UUID = "00000000-0000-4000-8000-000000000001";

type ProxyPostOptions = {
  body: Record<string, unknown>;
  bearer?: string;
};

/** Calls `GET /health` on the given app (root mount). */
export async function requestHealth(app: OpenAPIHono) {
  return app.request("http://test/health", { method: "GET" });
}

/** Calls `POST /ws/proj/{uuid}` with JSON body and Bearer token. */
export async function requestProxy(app: OpenAPIHono, { body, bearer = "Bearer test-token-ok" }: ProxyPostOptions) {
  return app.request(`http://test/ws/proj/${TEST_UUID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: bearer,
    },
    body: JSON.stringify(body),
  });
}

export { TEST_UUID };
