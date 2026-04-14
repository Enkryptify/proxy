import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpError, TooManyRequestsError } from "@/lib/utils/errors";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HttpError) {
    if (err instanceof TooManyRequestsError && err.retryAfter != null) {
      c.header("Retry-After", String(err.retryAfter));
    }

    return c.json({ error: err.message }, err.status as ContentfulStatusCode);
  }

  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
};
