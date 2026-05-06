import { describe, expect, test } from "bun:test";
import { app } from "@/app";
import { requestHealth } from "@/test/http";

describe("GET /health (e2e)", () => {
  test("returns 200 and ok payload", async () => {
    const res = await requestHealth(app);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string; timestamp: string };
    expect(json.status).toBe("ok");
    expect(typeof json.timestamp).toBe("string");
  });
});
