/** Runs before every test file (see apps/proxy/bunfig.toml). */
process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:5432/proxy_test";
process.env.DATABASE_LOGGING ??= "false";
process.env.DATABASE_MIGRATE_ON_START ??= "false";
