import { and, eq } from "drizzle-orm";
import { db } from "@/plugins/db";
import { whitelist_host, workspace_settings } from "@/lib/schemas";
import { ForbiddenError } from "@/lib/utils/errors";

export async function assertWhitelistAllows(workspaceId: string, targetHost: string): Promise<void> {
  if (!db) return;

  const settings = await db.query.workspace_settings.findFirst({
    where: eq(workspace_settings.workspaceId, workspaceId),
  });
  if (!settings?.whitelistMode) return;

  const normalized = targetHost.toLowerCase();
  const row = await db.query.whitelist_host.findFirst({
    where: and(
      eq(whitelist_host.workspaceId, workspaceId),
      eq(whitelist_host.hostname, normalized),
    ),
  });
  if (!row) {
    throw new ForbiddenError(
      `Host "${normalized}" is not on the whitelist for this workspace`,
    );
  }
}
