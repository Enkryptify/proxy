CREATE INDEX IF NOT EXISTS "tunnel_log_ws_created_at_idx"
  ON "tunnel_log" ("workspace", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tunnel_log_created_at_idx"
  ON "tunnel_log" ("created_at" DESC);
