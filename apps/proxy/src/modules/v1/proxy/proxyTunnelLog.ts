import { env } from "@/config/env";

const MAX_ERROR_LEN = 16_000;

function truncateError(message: string): string {
  if (message.length <= MAX_ERROR_LEN) return message;
  return `${message.slice(0, MAX_ERROR_LEN)}…`;
}

export type TunnelLogBase = {
  workspace: string;
  project: string;
  environmentId: string;
  targetHost: string;
  durationMs: number;
  placeholderKeys: string[];
};

export async function insertTunnelLogSuccess(
  base: TunnelLogBase,
  upstreamStatusCode: number,
): Promise<void> {
  if (!env.DATABASE_LOGGING) {
    return;
  }
  try {
    const { db } = await import("@/plugins/db");
    const { tunnel_log } = await import("@/lib/schemas");
    await db.insert(tunnel_log).values({
      logId: crypto.randomUUID(),
      workspace: base.workspace,
      project: base.project,
      environmentId: base.environmentId,
      link: base.targetHost,
      statusCode: upstreamStatusCode,
      outcome: "success",
      errorMessage: null,
      durationMs: base.durationMs,
      placeholderKeys: base.placeholderKeys,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[tunnel_log] insert success failed:", err);
    }
  }
}

export async function insertTunnelLogFailure(
  base: TunnelLogBase,
  statusCode: number,
  errorMessage: string,
): Promise<void> {
  if (!env.DATABASE_LOGGING) {
    return;
  }
  try {
    const { db } = await import("@/plugins/db");
    const { tunnel_log } = await import("@/lib/schemas");
    await db.insert(tunnel_log).values({
      logId: crypto.randomUUID(),
      workspace: base.workspace,
      project: base.project,
      environmentId: base.environmentId,
      link: base.targetHost,
      statusCode,
      outcome: "failure",
      errorMessage: truncateError(errorMessage),
      durationMs: base.durationMs,
      placeholderKeys: base.placeholderKeys,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[tunnel_log] insert failure failed:", err);
    }
  }
}
