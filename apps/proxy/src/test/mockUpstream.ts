type LookupFn = typeof Bun.dns.lookup;

let savedLookup: LookupFn | undefined;
let savedFetch: typeof fetch | undefined;

/** Forces `example.com` to resolve to a public IP so SSRF checks pass in tests. */
export function installPublicDnsMock(publicIp = "93.184.216.34"): void {
  if (savedLookup === undefined) {
    savedLookup = Bun.dns.lookup;
  }
  Bun.dns.lookup = async (hostname: string, options?: Parameters<LookupFn>[1]) => {
    if (hostname === "example.com") {
      return [{ address: publicIp, family: 4, ttl: 60 }] as Awaited<ReturnType<LookupFn>>;
    }
    return savedLookup!.call(Bun.dns, hostname, options);
  };
}

export function restoreDnsMock(): void {
  if (savedLookup) {
    Bun.dns.lookup = savedLookup;
    savedLookup = undefined;
  }
}

/** Replaces `globalThis.fetch` until `restoreFetchMock()` runs. */
export function installFetchMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response,
): void {
  if (savedFetch === undefined) {
    savedFetch = globalThis.fetch;
  }
  globalThis.fetch = handler as typeof fetch;
}

export function restoreFetchMock(): void {
  if (savedFetch !== undefined) {
    globalThis.fetch = savedFetch;
    savedFetch = undefined;
  }
}
