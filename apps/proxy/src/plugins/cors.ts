import { cors } from "hono/cors";

export const corsPlugin = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
});
