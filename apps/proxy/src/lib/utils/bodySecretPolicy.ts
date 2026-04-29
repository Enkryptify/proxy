
const SUBSTITUTION_MEDIA_TYPES = new Set([
  "application/json",
  "application/xml",
  "text/xml",
  "text/plain",
]);

// This is intentional, we don't know what it contains
export type SecretSubstitutionBody = unknown;

export function getContentTypeMediaType(headers: Record<string, string>): string | undefined {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "content-type") {
      return v.split(";")[0]?.trim().toLowerCase();
    }
  }
  return undefined;
}

export function shouldApplySecretSubstitutionToBody(
  mediaType?: string,
  bodyEncoding?: "base64",
  body?: SecretSubstitutionBody,
): boolean {
  if (bodyEncoding === "base64") {
    return false;
  }

  if (mediaType) {
    if (SUBSTITUTION_MEDIA_TYPES.has(mediaType)) {
      return true;
    }
    if (mediaType.endsWith("+json") && mediaType.startsWith("application/")) {
      return true;
    }
    if (mediaType.endsWith("+xml")) {
      return true;
    }
    return false;
  }

  if (body !== null && typeof body === "object") {
    return true;
  }

  if (typeof body === "string") {
    return true;
  }

  return false;
}
