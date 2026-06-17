DO $$ BEGIN
 IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'whitelist_host' AND column_name = 'workspace'
 ) THEN
   ALTER TABLE "whitelist_host" RENAME COLUMN "workspace" TO "workspace_id";
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'workspace_settings' AND column_name = 'workspace'
 ) THEN
   ALTER TABLE "workspace_settings" RENAME COLUMN "workspace" TO "workspace_id";
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
   SELECT 1 FROM pg_constraint WHERE conname = 'workspace_settings_workspace_unique'
 ) THEN
   ALTER TABLE "workspace_settings"
     RENAME CONSTRAINT "workspace_settings_workspace_unique" TO "workspace_settings_workspace_id_unique";
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tunnel_log' AND column_name = 'workspace'
 ) THEN
   ALTER TABLE "tunnel_log" RENAME COLUMN "workspace" TO "workspace_id";
 END IF;
END $$;
