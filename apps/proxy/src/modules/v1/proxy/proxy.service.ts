import type { ProxyRequest, ProxyResponse } from "./proxy.schemas";

export default class ProxyService {
  async forward(request: ProxyRequest, authorization: string, workspace: string, project: string, environmentId: string): Promise<ProxyResponse> {
    const { url, method, headers, body } = request;

    const hasBody = method !== "GET" && method !== "HEAD" && body !== undefined;

    // Request to the target endpoint
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
    });

    // Process the response
    return this.#processResponse(response);
  }

  async #processResponse(response: Response): Promise<ProxyResponse> {
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseBody = await response.json();
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
