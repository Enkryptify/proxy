CREATE TABLE IF NOT EXISTS "whitelist_host" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace" varchar(255) NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"added_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"workspace" varchar(255) NOT NULL,
	"whitelist_mode" boolean DEFAULT false NOT NULL,
	CONSTRAINT "workspace_settings_workspace_unique" UNIQUE("workspace")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "whitelist_host_ws_host_unique"
  ON "whitelist_host" ("workspace", "hostname");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whitelist_host_ws_idx"
  ON "whitelist_host" ("workspace");
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" varchar(32) DEFAULT 'user' NOT NULL;
