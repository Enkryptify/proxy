import { and, eq } from "drizzle-orm";
import { db } from "@/plugins/db";
import { whitelist_host, workspace_settings } from "@/lib/schemas";
import { ForbiddenError } from "@/lib/utils/errors";

/**
 * If the workspace has `whitelist_mode` enabled and the target host is not on
 * the workspace whitelist, throw 403 *before* we contact Enkryptify or fetch.
 * No-op when no DB is configured — the proxy stays usable in DB-less deployments.
 */
export async function assertWhitelistAllows(workspace: string, targetHost: string): Promise<void> {
  if (!db) return;

  const settings = await db.query.workspace_settings.findFirst({
    where: eq(workspace_settings.workspace, workspace),
  });
  if (!settings?.whitelistMode) return;

  const normalized = targetHost.toLowerCase();
  const row = await db.query.whitelist_host.findFirst({
    where: and(
      eq(whitelist_host.workspace, workspace),
      eq(whitelist_host.hostname, normalized),
    ),
  });
  if (!row) {
    throw new ForbiddenError(
      `Host "${normalized}" is not on the whitelist for workspace "${workspace}"`,
    );
  }
}
