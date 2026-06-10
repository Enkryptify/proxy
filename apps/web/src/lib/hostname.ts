import { z } from "zod";

/** RFC 1123-style labels: alphanumeric ends, hyphens only in the middle (input is lowercased). */
export const HOSTNAME_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const hostnameFieldSchema = z
  .string()
  .trim()
  .min(1, "Enter a hostname")
  .max(253)
  .transform((v) => v.toLowerCase())
  .refine((v) => HOSTNAME_RE.test(v), { message: "Not a valid hostname" });
