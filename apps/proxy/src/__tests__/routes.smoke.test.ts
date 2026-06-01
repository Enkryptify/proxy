import { describe, expect, test } from "bun:test";
import { app } from "@/app";

/**
 * Smoke test: verify that all admin/auth routes are mounted and that the
 * dynamic proxy route `/{workspace}/{project}/{environmentId}` does not
 * shadow more-specific `/api/...` routes.
 */
describe("route registration (smoke)", () => {
  const cases: Array<{
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    /** Statuses that prove the route was found (not 404 from missing mount). */
    expectedAny: number[];
  }> = [
    { method: "GET", path: "/health", expectedAny: [200] },
    { method: "GET", path: "/api/health", expectedAny: [200] },
    // Auth endpoints: 400 (Zod) or 401 (missing cookie/header) both mean the route is mounted.
    { method: "POST", path: "/api/auth/login", expectedAny: [400, 502] },
    { method: "POST", path: "/api/auth/refresh", expectedAny: [401, 502] },
    { method: "POST", path: "/api/auth/logout", expectedAny: [200] },
    { method: "GET", path: "/api/auth/me", expectedAny: [401] },
    // Admin endpoints require Authorization header → 401.
    { method: "GET", path: "/api/admin/stats", expectedAny: [401] },
    { method: "GET", path: "/api/admin/logs", expectedAny: [401] },
    {
      method: "GET",
      path: "/api/admin/whitelist?workspace=acme",
      expectedAny: [401],
    },
    { method: "POST", path: "/api/admin/whitelist", expectedAny: [401] },
    {
      method: "DELETE",
      path: "/api/admin/whitelist/00000000-0000-4000-8000-000000000001",
      expectedAny: [401],
    },
    { method: "GET", path: "/api/admin/settings/acme", expectedAny: [401] },
    { method: "PATCH", path: "/api/admin/settings/acme", expectedAny: [401] },
  ];

  for (const { method, path, expectedAny } of cases) {
    test(`${method} ${path} is mounted`, async () => {
      const res = await app.request(`http://test${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" || method === "PATCH" ? "{}" : undefined,
      });
      expect(expectedAny).toContain(res.status);
    });
  }
});
