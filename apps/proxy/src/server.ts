import { app, initAppWithDb } from "./app";

await initAppWithDb();

export default {
  fetch: app.fetch,
};
