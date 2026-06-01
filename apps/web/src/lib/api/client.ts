import { getAccessToken, setAccessToken } from "@/lib/auth/tokenStore";
import { refreshSession } from "@/lib/auth/refresh";
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * `import.meta.env.VITE_API_BASE_URL` is "" in dev (so requests go through Vite's
 * proxy at /api → http://localhost:3000), and may be an absolute origin in prod.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type RequestInitJson = Omit<RequestInit, "body"> & {
  json?: unknown;
  body?: BodyInit | null;
};

async function doFetch(path: string, init: RequestInitJson): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = `${BASE_URL}${path}`;
  return fetch(url, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    credentials: "include",
  });
}

export async function apiFetch<T>(path: string, init: RequestInitJson = {}): Promise<T> {
  let res = await doFetch(path, init);

  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const result = await refreshSession();
    if (result.ok) {
      res = await doFetch(path, init);
    } else {
      setAccessToken(null, null);
    }
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    const message =
      body && typeof body === "object" && body !== null && "error" in body
        ? String((body as ApiErrorBody).error)
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  // 204 / empty body
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T>(path: string, init: RequestInitJson = {}) =>
    apiFetch<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, json?: unknown, init: RequestInitJson = {}) =>
    apiFetch<T>(path, { ...init, method: "POST", json }),
  patch: <T>(path: string, json?: unknown, init: RequestInitJson = {}) =>
    apiFetch<T>(path, { ...init, method: "PATCH", json }),
  delete: <T>(path: string, init: RequestInitJson = {}) =>
    apiFetch<T>(path, { ...init, method: "DELETE" }),
};
