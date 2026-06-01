import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/plugins/db";
import { tunnel_log, whitelist_host, workspace_settings } from "@/lib/schemas";
import { BadGatewayError, NotFoundError } from "@/lib/utils/errors";
import type {
  LogsResponse,
  SettingsResponse,
  StatsResponse,
  WhitelistEntry,
} from "./admin.schemas";

function assertDb() {
  if (!db) {
    throw new BadGatewayError(
      "Admin panel requires DATABASE_URL to be configured on the proxy",
    );
  }
  return db;
}

export default class AdminService {
  async getStats(input: { windowHours: number; workspace?: string }): Promise<StatsResponse> {
    const database = assertDb();
    const since = new Date(Date.now() - input.windowHours * 60 * 60 * 1000);

    const filter = input.workspace
      ? and(gte(tunnel_log.createdAt, since), eq(tunnel_log.workspace, input.workspace))
      : gte(tunnel_log.createdAt, since);

    const rows = await database
      .select({
        total: sql<number>`COUNT(*)::int`,
        success: sql<number>`SUM(CASE WHEN ${tunnel_log.outcome} = 'success' THEN 1 ELSE 0 END)::int`,
        failure: sql<number>`SUM(CASE WHEN ${tunnel_log.outcome} = 'failure' THEN 1 ELSE 0 END)::int`,
        avgMs: sql<number>`COALESCE(AVG(${tunnel_log.durationMs}), 0)::float8`,
        p95Ms: sql<number>`COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${tunnel_log.durationMs}), 0)::float8`,
      })
      .from(tunnel_log)
      .where(filter);

    const row = rows[0] ?? { total: 0, success: 0, failure: 0, avgMs: 0, p95Ms: 0 };

    return {
      totalRequests: Number(row.total ?? 0),
      successCount: Number(row.success ?? 0),
      failureCount: Number(row.failure ?? 0),
      avgDurationMs: Math.round(Number(row.avgMs ?? 0)),
      p95DurationMs: Math.round(Number(row.p95Ms ?? 0)),
      windowHours: input.windowHours,
      generatedAt: new Date().toISOString(),
    };
  }

  async listLogs(input: { page: number; pageSize: number; workspace?: string }): Promise<LogsResponse> {
    const database = assertDb();
    const filter = input.workspace ? eq(tunnel_log.workspace, input.workspace) : undefined;

    const [totalRow] = await database
      .select({ total: count() })
      .from(tunnel_log)
      .where(filter);

    const items = await database
      .select({
        id: tunnel_log.id,
        createdAt: tunnel_log.createdAt,
        workspace: tunnel_log.workspace,
        project: tunnel_log.project,
        environmentId: tunnel_log.environmentId,
        targetHost: tunnel_log.link,
        statusCode: tunnel_log.statusCode,
        outcome: tunnel_log.outcome,
        durationMs: tunnel_log.durationMs,
        placeholderKeys: tunnel_log.placeholderKeys,
      })
      .from(tunnel_log)
      .where(filter)
      .orderBy(desc(tunnel_log.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    return {
      items: items.map((it) => ({
        id: it.id,
        createdAt: it.createdAt.toISOString(),
        workspace: it.workspace,
        project: it.project,
        environmentId: it.environmentId,
        targetHost: it.targetHost,
        statusCode: it.statusCode,
        outcome: it.outcome === "success" ? "success" : "failure",
        durationMs: it.durationMs,
        placeholderKeys: it.placeholderKeys ?? [],
      })),
      page: input.page,
      pageSize: input.pageSize,
      total: Number(totalRow?.total ?? 0),
    };
  }

  async listWhitelist(workspace: string): Promise<{ items: WhitelistEntry[]; whitelistMode: boolean }> {
    const database = assertDb();
    const rows = await database
      .select()
      .from(whitelist_host)
      .where(eq(whitelist_host.workspace, workspace))
      .orderBy(whitelist_host.hostname);

    const settings = await this.getSettings(workspace);

    return {
      items: rows.map((row) => ({
        id: row.id,
        workspace: row.workspace,
        hostname: row.hostname,
        addedBy: row.addedBy ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      whitelistMode: settings.whitelistMode,
    };
  }

  async addWhitelist(input: {
    workspace: string;
    hostname: string;
    addedBy: string | null;
  }): Promise<WhitelistEntry> {
    const database = assertDb();

    const [row] = await database
      .insert(whitelist_host)
      .values({
        workspace: input.workspace,
        hostname: input.hostname,
        addedBy: input.addedBy,
      })
      .onConflictDoNothing({
        target: [whitelist_host.workspace, whitelist_host.hostname],
      })
      .returning();

    if (row) {
      return {
        id: row.id,
        workspace: row.workspace,
        hostname: row.hostname,
        addedBy: row.addedBy ?? null,
        createdAt: row.createdAt.toISOString(),
      };
    }

    const existing = await database.query.whitelist_host.findFirst({
      where: and(
        eq(whitelist_host.workspace, input.workspace),
        eq(whitelist_host.hostname, input.hostname),
      ),
    });
    if (!existing) {
      throw new NotFoundError("Whitelist entry not found after conflict");
    }
    return {
      id: existing.id,
      workspace: existing.workspace,
      hostname: existing.hostname,
      addedBy: existing.addedBy ?? null,
      createdAt: existing.createdAt.toISOString(),
    };
  }

  async removeWhitelist(id: string): Promise<void> {
    const database = assertDb();
    const result = await database
      .delete(whitelist_host)
      .where(eq(whitelist_host.id, id))
      .returning({ id: whitelist_host.id });
    if (result.length === 0) {
      throw new NotFoundError("Whitelist entry not found");
    }
  }

  async getSettings(workspace: string): Promise<SettingsResponse> {
    const database = assertDb();
    const row = await database.query.workspace_settings.findFirst({
      where: eq(workspace_settings.workspace, workspace),
    });
    return {
      workspace,
      whitelistMode: row?.whitelistMode ?? false,
    };
  }

  async updateSettings(workspace: string, whitelistMode: boolean): Promise<SettingsResponse> {
    const database = assertDb();
    await database
      .insert(workspace_settings)
      .values({ workspace, whitelistMode })
      .onConflictDoUpdate({
        target: workspace_settings.workspace,
        set: { whitelistMode, updatedAt: new Date() },
      });
    return { workspace, whitelistMode };
  }
}
