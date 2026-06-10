ALTER TABLE "whitelist_host" RENAME COLUMN "workspace" TO "workspace_id";
--> statement-breakpoint
ALTER TABLE "workspace_settings" RENAME COLUMN "workspace" TO "workspace_id";
--> statement-breakpoint
ALTER TABLE "workspace_settings"
  RENAME CONSTRAINT "workspace_settings_workspace_unique" TO "workspace_settings_workspace_id_unique";
--> statement-breakpoint
ALTER TABLE "tunnel_log" RENAME COLUMN "workspace" TO "workspace_id";
