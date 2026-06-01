import { env } from "@/config/env";
import { db } from "@/plugins/db";
import { tunnel_log } from "@/lib/schemas";

const MAX_ERROR_LEN = 16_000;

function truncateError(message: string): string {
  if (MAX_ERROR_LEN <= 0) return "";
  if (message.length <= MAX_ERROR_LEN) return message;
  if (MAX_ERROR_LEN < 2) return "…";
  return `${message.slice(0, Math.max(0, MAX_ERROR_LEN - 1))}…`;
}

export type TunnelLogBase = {
  workspace: string;
  project: string;
  environmentId: string;
  targetHost: string;
  durationMs: number;
  placeholderKeys: string[];
};

function normalizeDurationMs(durationMs: TunnelLogBase["durationMs"]): number {
  if (!Number.isFinite(durationMs) || Number.isNaN(durationMs)) {
    return 0;
  }
  return Math.max(0, Math.round(durationMs));
}

async function insertTunnelLog(
  base: TunnelLogBase,
  statusCode: number,
  outcome: "success" | "failure",
  errorMessage: string | null,
): Promise<void> {
  if (!env.DATABASE_LOGGING || !db) {
    return;
  }
  try {
    const normalizedDurationMs = normalizeDurationMs(base.durationMs);
    await db.insert(tunnel_log).values({
      logId: crypto.randomUUID(),
      workspaceId: base.workspace,
      project: base.project,
      environmentId: base.environmentId,
      link: base.targetHost,
      statusCode,
      outcome,
      errorMessage: errorMessage == null ? null : truncateError(errorMessage),
      durationMs: normalizedDurationMs,
      placeholderKeys: base.placeholderKeys,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.error(`[tunnel_log] insert ${outcome} failed:`, err);
    }
  }
}

export async function insertTunnelLogSuccess(
  base: TunnelLogBase,
  upstreamStatusCode: number,
): Promise<void> {
  await insertTunnelLog(base, upstreamStatusCode, "success", null);
}

export async function insertTunnelLogFailure(
  base: TunnelLogBase,
  statusCode: number,
  errorMessage: string,
): Promise<void> {
  await insertTunnelLog(base, statusCode, "failure", errorMessage);
}
