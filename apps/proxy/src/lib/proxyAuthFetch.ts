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
      if (!merged.headers.has("proxy-authorization")) {
        // Enkryptify vault expects the proxy key on vault-origin requests only.
        merged.headers.set("Proxy-Authorization", proxyKey);
      }
      return originalFetch(merged);
    }

    const headers = new Headers(init?.headers);
    if (!headers.has("proxy-authorization")) {
      headers.set("Proxy-Authorization", proxyKey);
    }
    return originalFetch(input, { ...init, headers });
  };

  copyFetchStatics(patched, originalFetch);

  globalThis.fetch = patched as typeof fetch;
  installed = true;
}

/** Bun/Node may attach extra properties on `fetch`; preserve them after patching. */
function copyFetchStatics(patched: typeof fetch, original: typeof fetch): void {
  for (const key of Object.keys(original) as Array<keyof typeof original>) {
    (patched as unknown as Record<string, unknown>)[key as string] = (
      original as unknown as Record<string, unknown>
    )[key as string];
  }
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
