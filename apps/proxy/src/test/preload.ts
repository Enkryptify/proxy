/** Runs before every test file (see apps/proxy/bunfig.toml). */
process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
delete process.env.DATABASE_URL;
process.env.DATABASE_LOGGING ??= "false";
process.env.DATABASE_MIGRATE_ON_START ??= "false";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-0123456789abcdef";
