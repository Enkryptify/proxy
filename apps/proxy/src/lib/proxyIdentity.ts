import { env } from "@/config/env";
import { BadGatewayError, UnauthorizedError } from "@/lib/utils/errors";

export type ProxyWorkspaceIdentity = {
  workspaceId: string;
  workspaceName: string;
};

type WorkspaceListItem = {
  id: string;
  name: string;
  slug?: string;
  ownerId?: string;
};

let cached: ProxyWorkspaceIdentity | null = null;
let inflight: Promise<ProxyWorkspaceIdentity> | null = null;

export function clearProxyIdentityCache(): void {
  cached = null;
  inflight = null;
}

export async function getProxyWorkspace(): Promise<ProxyWorkspaceIdentity> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = fetchProxyWorkspace()
    .then((result) => {
      cached = result;
      return result;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function fetchProxyWorkspace(): Promise<ProxyWorkspaceIdentity> {
  if (!env.PROXY_KEY) {
    throw new BadGatewayError(
      "PROXY_KEY is not configured — proxy cannot resolve its workspace from the vault",
    );
  }

  const url = `${env.ENKRYPTIFY_API_URL.replace(/\/$/, "")}/v1/workspace/`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.PROXY_KEY}`,
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new BadGatewayError(
      `Could not reach Enkryptify vault at ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (res.status === 401) {
    throw new UnauthorizedError("PROXY_KEY is invalid or expired");
  }
  if (!res.ok) {
    throw new BadGatewayError(
      `Enkryptify vault returned ${res.status} when resolving the proxy workspace`,
    );
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new BadGatewayError("Enkryptify vault returned a non-JSON workspace response");
  }

  if (!Array.isArray(payload)) {
    throw new BadGatewayError("Enkryptify vault returned an unexpected workspace shape");
  }
  const items = payload.filter(isWorkspaceListItem);
  if (items.length === 0) {
    throw new BadGatewayError("PROXY_KEY does not grant access to any workspace");
  }
  if (items.length > 1) {
    throw new BadGatewayError(
      `PROXY_KEY must be scoped to exactly one workspace; the vault returned ${items.length}. ` +
        `Issue a workspace-scoped PROXY_KEY or run one proxy per workspace.`,
    );
  }

  const w = items[0]!;
  return { workspaceId: w.id, workspaceName: w.name };
}

function isWorkspaceListItem(value: unknown): value is WorkspaceListItem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    (value as { id: string }).id.length > 0 &&
    typeof (value as { name?: unknown }).name === "string"
  );
}
