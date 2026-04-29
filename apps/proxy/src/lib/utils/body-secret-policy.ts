/**
 * Decides whether `%KEY%` secret substitution may run on the *request body*.
 *
 * Substitution treats the body as text (strings / JSON tree). For uploads like PDFs or S3 PUTs,
 * that would corrupt binary data, so we only enable it for explicit text/JSON/XML media types.
 * URL and header substitution are handled separately in inject.ts (always on strings).
 */

const SUBSTITUTION_MEDIA_TYPES = new Set([
  "application/json",
  "application/xml",
  "text/xml",
  "text/plain",
]);

/** Returns the media type only (lowercased), e.g. `application/json` — strips charset and other parameters. */
export function getContentTypeMediaType(headers: Record<string, string>): string | undefined {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "content-type") {
      return v.split(";")[0]?.trim().toLowerCase();
    }
  }
  return undefined;
}

/**
 * Returns true only when body content is safe to scan/replace as text.
 * - `bodyEncoding: "base64"` → false (body will be decoded to raw bytes later; never treat as text).
 * - Known JSON/XML/plain → true; `+json` / `+xml` vendor types → true.
 * - Other explicit types (e.g. `application/pdf`, `image/png`) → false.
 * - Missing Content-Type: structured JSON object/array → true (typical API body); bare string → true (legacy text).
 */
export function shouldApplySecretSubstitutionToBody(
  mediaType: string | undefined,
  bodyEncoding: "base64" | undefined,
  body: unknown,
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

  // No Content-Type: assume JSON-like envelope only for structured bodies (legacy).
  if (body !== null && typeof body === "object") {
    return true;
  }

  // Bare string without Content-Type: treat as text (placeholders).
  if (typeof body === "string") {
    return true;
  }

  return false;
}
