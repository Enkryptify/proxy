import type { ProxyRequest, ProxyResponse } from "./proxy.schemas";
import { assertExternalUrl } from "@/lib/utils/network";

const FETCH_TIMEOUT_MS = 30_000;

export default class ProxyService {
  async forward(request: ProxyRequest): Promise<ProxyResponse> {
    const { url, method, headers, body } = request;

    const { resolvedUrl, originalHostname } = await assertExternalUrl(url);

    const outgoingHeaders = { ...headers, Host: originalHostname };
    const hasBody = method !== "GET" && method !== "HEAD" && body !== undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(resolvedUrl, {
        method,
        headers: outgoingHeaders,
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      return this.#processResponse(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  async #processResponse(response: Response) {
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";

    const text = await response.text();

    if (contentType.includes("application/json")) {
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
