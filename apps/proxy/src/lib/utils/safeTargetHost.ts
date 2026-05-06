export function safeTargetHostFromUrl(urlString: string): string {
  try {
    const u = new URL(urlString);
    return u.hostname || "unknown";
  } catch {
    return "invalid-url";
  }
}
