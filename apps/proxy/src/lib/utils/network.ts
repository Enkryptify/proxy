const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some((range) => range.test(ip));
}

export async function assertExternalUrl(url: string): Promise<void> {
  const { hostname } = new URL(url);

  if (hostname === "localhost") {
    throw new Error("Requests to localhost are not allowed");
  }

  if (isPrivateIP(hostname)) {
    throw new Error("Requests to private IP addresses are not allowed");
  }

  const resolved = await resolveHostname(hostname);
  if (resolved && isPrivateIP(resolved)) {
    throw new Error("Hostname resolves to a private IP address");
  }
}

async function resolveHostname(hostname: string): Promise<string | null> {
  try {
    const results = await Bun.dns.lookup(hostname);
    return results[0]?.address ?? null;
  } catch {
    return null;
  }
}
