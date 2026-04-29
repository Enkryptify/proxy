import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HttpError, TooManyRequestsError } from "@/lib/utils/errors";
import { logger, sanitizeErrorLogMeta } from "@/lib/utils/logger";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HttpError) {
    if (err instanceof TooManyRequestsError && err.retryAfter != null) {
      c.header("Retry-After", String(err.retryAfter));
    }

    return c.json({ error: err.message }, err.status as ContentfulStatusCode);
  }

  const meta =
    err instanceof Error
      ? { name: err.name, message: err.message, stack: err.stack }
      : { message: String(err) };
  logger.error("Unhandled error", sanitizeErrorLogMeta(meta));
  return c.json({ error: "Something went wrong. Please try again." }, 500);
};
