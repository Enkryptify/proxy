import type { ProxyRequest, ProxyResponse } from "./proxy.schemas";
import { assertExternalUrl } from "@/lib/utils/network";
import { injectSecrets } from "@/lib/utils/inject";
import { BadRequestError, UnauthorizedError, ForbiddenError, TooManyRequestsError, BadGatewayError } from "@/lib/utils/errors";
import { EnkryptifyError, AuthenticationError, AuthorizationError, SecretNotFoundError, RateLimitError } from "@enkryptify/sdk";

const FETCH_TIMEOUT_MS = 30_000;

export default class ProxyService {
  /**
   * 1) Resolve `%...%` in URL/headers/body (body only when Content-Type is text-safe — see inject).
   * 2) SSRF-check and pin DNS to the resolved IP for `fetch`.
   * 3) Serialize body (JSON string, raw string, or base64 → bytes).
   * 4) Return upstream status/headers/body (response body is read as text today; binary responses stay UTF-8–safe only if text).
   */
  async forward(
    request: ProxyRequest,
    authorization: string,
    workspace: string,
    project: string,
    environmentId: string,
  ): Promise<ProxyResponse> {
    const { method } = request;

    const injected = await this.#injectSecrets(
      request,
      authorization,
      workspace,
      project,
      environmentId,
    );
    const { resolvedUrl, originalHostname } = await this.#resolveUrl(injected.url);

    const outgoingHeaders = { ...injected.headers, Host: originalHostname };
    const hasBody = method !== "GET" && method !== "HEAD" && injected.body != null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const bodyPayload = hasBody
        ? this.#serializeUpstreamBody(injected.body, outgoingHeaders, request.bodyEncoding)
        : undefined;

      const response = await fetch(resolvedUrl, {
        method,
        headers: outgoingHeaders,
        body: bodyPayload,
        signal: controller.signal,
      });

      return this.#processResponse(response);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new BadGatewayError("Target endpoint timed out");
      }
      if (error instanceof TypeError) {
        throw new BadGatewayError("Failed to connect to target endpoint");
      }
      throw new BadGatewayError("Failed to reach target endpoint");
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Maps Enkryptify SDK errors to HTTP errors for consistent JSON error responses. */
  async #injectSecrets(
    request: ProxyRequest,
    authorization: string,
    workspace: string,
    project: string,
    environmentId: string,
  ) {
    try {
      return await injectSecrets({
        url: request.url,
        headers: request.headers,
        body: request.body,
        bodyEncoding: request.bodyEncoding,
        workspace,
        project,
        environmentId,
        authorization,
      });
    } catch (error) {
      if (!(error instanceof EnkryptifyError)) throw error;

      if (error instanceof AuthenticationError) {
        throw new UnauthorizedError("Invalid or expired token");
      }
      if (error instanceof AuthorizationError) {
        throw new ForbiddenError("Insufficient permissions for the requested secrets");
      }
      if (error instanceof SecretNotFoundError) {
        throw new BadRequestError(error.message);
      }
      if (error instanceof RateLimitError) {
        throw new TooManyRequestsError("Secret retrieval rate limited", error.retryAfter);
      }
      throw new BadGatewayError("Secret provider unavailable");
    }
  }

  /**
   * Turns the validated JSON `body` field into what `fetch` accepts.
   * - `base64`: decode to `Uint8Array` so binary (S3, images) is not passed through `JSON.stringify` or UTF-8 string paths.
   * - `string`: sent as-is (XML, plain text, etc.); caller should set `Content-Type`.
   * - object/array/…: `JSON.stringify`; default `Content-Type` only when missing.
   */
  #serializeUpstreamBody(
    body: unknown,
    headers: Record<string, string>,
    bodyEncoding: "base64" | undefined,
  ): BodyInit {
    if (bodyEncoding === "base64") {
      if (typeof body !== "string") {
        throw new BadRequestError('bodyEncoding "base64" requires body to be a base64 string');
      }
      try {
        const buf = Buffer.from(body, "base64");
        return new Uint8Array(buf);
      } catch {
        throw new BadRequestError("Invalid base64 body");
      }
    }

    if (typeof body === "string") {
      return body;
    }
    if (!this.#hasHeader(headers, "content-type")) {
      headers["Content-Type"] = "application/json; charset=utf-8";
    }
    return JSON.stringify(body);
  }

  /** Header names are case-insensitive; we must not add a second `Content-Type` under another casing. */
  #hasHeader(headers: Record<string, string>, name: string): boolean {
    const lower = name.toLowerCase();
    return Object.keys(headers).some((k) => k.toLowerCase() === lower);
  }

  async #resolveUrl(url: string) {
    try {
      return await assertExternalUrl(url);
    } catch (error) {
      throw new BadRequestError(
        error instanceof Error ? error.message : "Invalid target URL",
      );
    }
  }

  async #processResponse(response: Response): Promise<ProxyResponse> {
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";

    // Note: `text()` decodes as UTF-8. Fine for JSON/XML/text; binary downloads would need arrayBuffer/base64 instead.
    const text = await response.text();

    const isJson =
      contentType.includes("application/json") || /\bjson\b/i.test(contentType);
    if (isJson) {
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
    } else {
      responseBody = text;
    }

    return {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    };
  }
}
