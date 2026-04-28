/** Runs before tests so `@/config/env` can load when the app module is imported. */
process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
process.env.DATABASE_URL ??= "postgres://127.0.0.1:5432/proxy_test";
process.env.DATABASE_LOGGING ??= "false";
