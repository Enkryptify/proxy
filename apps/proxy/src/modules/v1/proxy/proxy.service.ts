import type { ProxyRequest, ProxyResponse } from "./proxy.schemas";

const FETCH_TIMEOUT_MS = 30_000;

export default class ProxyService {
  async forward(request: ProxyRequest, authorization: string, workspace: string, project: string, environmentId: string): Promise<ProxyResponse> {
    const { url, method, headers, body } = request;

    const hasBody = method !== "GET" && method !== "HEAD" && body !== undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      return this.#processResponse(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  async #processResponse(response: Response): Promise<ProxyResponse> {
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    return {
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    };
  }
}
