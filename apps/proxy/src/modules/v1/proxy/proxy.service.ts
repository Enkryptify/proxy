import type { ProxyRequest } from "./proxy.schemas";

export type ProxyResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

export default class ProxyService {
  async forward(request: ProxyRequest): Promise<ProxyResponse> {
    const { url, method, headers, body } = request;

    const hasBody = method !== "GET" && method !== "HEAD" && body !== undefined;

    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
    });

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
