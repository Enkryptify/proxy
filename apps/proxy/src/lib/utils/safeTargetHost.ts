/**
 * Returns only the hostname for safe persistence (no path, query, fragment, userinfo, or ports in the stored string).
 * API keys and tokens often live in query strings — they must not be logged.
 */
export function safeTargetHostFromUrl(urlString: string): string {
  try {
    const u = new URL(urlString);
    return u.hostname || "unknown";
  } catch {
    return "invalid-url";
  }
}
