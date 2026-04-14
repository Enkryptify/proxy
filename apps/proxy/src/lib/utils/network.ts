const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^::ffff:/i,
  /^fe[89ab][0-9a-f]:/i,
  /^f[cd][0-9a-f]{2}:/i,
];

function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some((range) => range.test(ip));
}

type ValidatedUrl = {
  resolvedUrl: string;
  originalHostname: string;
};

export async function assertExternalUrl(url: string): Promise<ValidatedUrl> {
  const parsed = new URL(url);
  const { hostname } = parsed;

  if (hostname === "localhost") {
    throw new Error("Requests to localhost are not allowed");
  }

  if (isPrivateIP(hostname)) {
    throw new Error("Requests to private IP addresses are not allowed");
  }

  const results = await Bun.dns.lookup(hostname);

  if (results.length === 0) {
    throw new Error("Hostname could not be resolved");
  }

  for (const { address } of results) {
    if (isPrivateIP(address)) {
      throw new Error("Hostname resolves to a private IP address");
    }
  }

  const resolvedIp = results[0].address;
  const isIPv6 = resolvedIp.includes(":");

  parsed.hostname = isIPv6 ? `[${resolvedIp}]` : resolvedIp;

  return {
    resolvedUrl: parsed.toString(),
    originalHostname: hostname,
  };
}
