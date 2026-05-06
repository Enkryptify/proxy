import { afterEach, describe, expect, test } from "bun:test";
import { app } from "@/app";
import { requestProxy } from "@/test/http";
import { installFetchMock, installPublicDnsMock, restoreDnsMock, restoreFetchMock } from "@/test/mockUpstream";

describe("POST /v1/proxy/... (e2e)", () => {
  afterEach(() => {
    restoreDnsMock();
    restoreFetchMock();
  });

  test("rejects SSRF target (loopback) with 400 before upstream fetch", async () => {
    const res = await requestProxy(app, {
      body: {
        url: "http://127.0.0.1:9999/x",
        method: "GET",
        headers: {},
      },
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toMatch(/private|localhost|not allowed/i);
  });

  test("rejects invalid Bearer header shape (validation)", async () => {
    const res = await app.request("http://test/v1/proxy/ws/proj/00000000-0000-4000-8000-000000000001", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "not-a-bearer",
      },
      body: JSON.stringify({
        url: "https://example.com/",
        method: "GET",
        headers: {},
      }),
    });
    expect(res.status).toBe(400);
  });

  test("successful proxy round-trip with mocked DNS and fetch (reliability)", async () => {
    installPublicDnsMock();
    installFetchMock(async () => {
      return new Response(JSON.stringify({ proxied: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const res = await requestProxy(app, {
      body: {
        url: "https://example.com/api",
        method: "GET",
        headers: {},
      },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      status: number;
      body: unknown;
    };
    expect(json.status).toBe(200);
    expect(json.body).toEqual({ proxied: true });
  });

  test("invalid base64 body returns 400 (security / input validation)", async () => {
    installPublicDnsMock();

    const res = await requestProxy(app, {
      body: {
        url: "https://example.com/put",
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: "not!!!valid-base64",
        bodyEncoding: "base64",
      },
    });

    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toMatch(/base64/i);
  });
});
