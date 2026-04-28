CREATE INDEX IF NOT EXISTS "tunnel_log_ws_proj_env_created_at_idx"
  ON "tunnel_log" ("workspace", "project", "environment_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tunnel_log_ws_env_created_at_idx"
  ON "tunnel_log" ("workspace", "environment_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tunnel_log_ws_proj_env_status_created_at_idx"
  ON "tunnel_log" ("workspace", "project", "environment_id", "status_code", "created_at" DESC);
