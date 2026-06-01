import { env } from "@/config/env";

let installed = false;

export function installProxyAuthFetch(): void {
  if (installed) return;
  if (!env.PROXY_KEY) return;

  const originalFetch = globalThis.fetch.bind(globalThis);
  const proxyKey = env.PROXY_KEY;

  let vaultOrigin = "";
  try {
    vaultOrigin = new URL(env.ENKRYPTIFY_API_URL).origin;
  } catch {
    return;
  }

  const patched = async function fetchWithProxyAuth(
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> {
    if (!isVaultRequest(input, vaultOrigin)) {
      return originalFetch(input, init);
    }

    if (input instanceof Request) {
      const merged = new Request(input, init);
      if (!merged.headers.has("proxy_authentication")) {
        merged.headers.set("proxy_authentication", proxyKey);
      }
      return originalFetch(merged);
    }

    const headers = new Headers(init?.headers);
    if (!headers.has("proxy_authentication")) {
      headers.set("proxy_authentication", proxyKey);
    }
    return originalFetch(input, { ...init, headers });
  };

  for (const key of Object.keys(originalFetch) as Array<keyof typeof originalFetch>) {
    (patched as unknown as Record<string, unknown>)[key as string] =
      (originalFetch as unknown as Record<string, unknown>)[key as string];
  }

  globalThis.fetch = patched as typeof fetch;
  installed = true;
}

function isVaultRequest(input: Parameters<typeof fetch>[0], vaultOrigin: string): boolean {
  let urlString: string;
  if (typeof input === "string") {
    urlString = input;
  } else if (input instanceof URL) {
    urlString = input.toString();
  } else {
    urlString = input.url;
  }
  try {
    return new URL(urlString).origin === vaultOrigin;
  } catch {
    return false;
  }
}
