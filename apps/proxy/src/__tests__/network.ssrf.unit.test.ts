import { afterEach, describe, expect, test } from "bun:test";
import { assertExternalUrl } from "@/lib/utils/network";
import { installPublicDnsMock, restoreDnsMock } from "@/test/mockUpstream";

describe("assertExternalUrl (SSRF security)", () => {
  afterEach(() => {
    restoreDnsMock();
  });
  test("rejects localhost hostname without DNS", async () => {
    await expect(assertExternalUrl("http://localhost:3000/api")).rejects.toThrow(/localhost/i);
  });

  test("rejects literal private IPv4 in URL", async () => {
    await expect(assertExternalUrl("http://192.168.1.1/")).rejects.toThrow(/private/i);
    await expect(assertExternalUrl("http://10.0.0.1/")).rejects.toThrow(/private/i);
  });

  test("rejects loopback IPv4", async () => {
    await expect(assertExternalUrl("http://127.0.0.1/")).rejects.toThrow(/private|localhost/i);
  });

  test("rejects loopback IPv6", async () => {
    await expect(assertExternalUrl("http://[::1]/")).rejects.toThrow(/private|localhost/i);
  });

  test("rejects unique-local IPv6", async () => {
    await expect(assertExternalUrl("http://[fc00::1]/")).rejects.toThrow(/private|localhost/i);
  });

  test("keeps hostname for HTTPS after SSRF validation (TLS/SNI)", async () => {
    installPublicDnsMock();
    const { resolvedUrl, originalHostname } = await assertExternalUrl(
      "https://example.com/path?x=1",
    );
    expect(resolvedUrl).toBe("https://example.com/path?x=1");
    expect(originalHostname).toBe("example.com");
  });
});
