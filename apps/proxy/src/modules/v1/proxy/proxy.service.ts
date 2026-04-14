import type { ProxyRequest, ProxyResponse } from "./proxy.schemas";
import { assertExternalUrl } from "@/lib/utils/network";
import { injectSecrets } from "@/lib/utils/inject";
import { BadRequestError, UnauthorizedError, ForbiddenError, TooManyRequestsError, BadGatewayError } from "@/lib/utils/errors";
import { EnkryptifyError, AuthenticationError, AuthorizationError, SecretNotFoundError, RateLimitError } from "@enkryptify/sdk";

const FETCH_TIMEOUT_MS = 30_000;

export default class ProxyService {
  async forward(
    request: ProxyRequest,
    authorization: string,
    workspace: string,
    project: string,
    environmentId: string,
  ): Promise<ProxyResponse> {
    const { method } = request;

    const injected = await this.#injectSecrets(request, authorization, workspace, project, environmentId);
    const { resolvedUrl, originalHostname } = await this.#resolveUrl(injected.url);

    const outgoingHeaders = { ...injected.headers, Host: originalHostname };
    const hasBody = method !== "GET" && method !== "HEAD" && injected.body !== undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(resolvedUrl, {
        method,
        headers: outgoingHeaders,
        body: hasBody ? JSON.stringify(injected.body) : undefined,
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
        workspace,
        project,
        environmentId,
        authorization,
      });
    } catch (error) {
      if (!(error instanceof EnkryptifyError)) throw error;

      switch (error.constructor) {
        case AuthenticationError:
          throw new UnauthorizedError("Invalid or expired token");
        case AuthorizationError:
          throw new ForbiddenError("Insufficient permissions for the requested secrets");
        case SecretNotFoundError:
          throw new BadRequestError(error.message);
        case RateLimitError:
          throw new TooManyRequestsError("Secret retrieval rate limited", (error as RateLimitError).retryAfter);
        default:
          throw new BadGatewayError("Secret provider unavailable");
      }
    }
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
