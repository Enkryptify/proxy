import { describe, expect, test } from "bun:test";
import { safeTargetHostFromUrl } from "@/lib/utils/safeTargetHost";

describe("safeTargetHostFromUrl (no secrets in DB)", () => {
  test("strips path, query, and fragment", () => {
    expect(safeTargetHostFromUrl("https://api.vendor.com/v1/secret?token=abc#x")).toBe("api.vendor.com");
  });

  test("returns hostname for IP literals (no path logged)", () => {
    expect(safeTargetHostFromUrl("http://203.0.113.5:9000/path")).toBe("203.0.113.5");
  });

  test("returns invalid-url for malformed inputs", () => {
    expect(safeTargetHostFromUrl("http://%ZZ")).toBe("invalid-url");
  });
});
