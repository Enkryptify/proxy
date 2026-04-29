import path from "node:path";
import fs from "node:fs";
import { createLogger, format, transports } from "winston";
import { env } from "@/config/env";

const logDir = path.resolve(process.cwd(), "logs");
let canUseFileTransport = true;
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch (err) {
  canUseFileTransport = false;
  console.error("[logger] Failed to create logs directory, falling back to console-only logging.", err);
}

const filePath = path.join(logDir, "proxy.log");

const MAX_STRING_LOG_LEN = 2_000;

function redactSecretsInString(input: string): string {
  let out = input;

  out = out.replace(/Bearer\s+([A-Za-z0-9\-_.]+)/gi, "Bearer [REDACTED]");

  out = out.replace(
    /\b[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g,
    "[REDACTED_JWT]",
  );

  out = out.replace(/\b[A-Za-z0-9+/]{100,}={0,2}\b/g, "[REDACTED_BASE64]");

  out = out.replace(/%[^%]{2,}%/g, "%[REDACTED]%");

  out = out.replace(
    /\b(token|secret)\b\s*[:=]\s*["']?([A-Za-z0-9\-_.]{10,})["']?/gi,
    (_m, k) => `${k}=[REDACTED]`,
  );

  if (out.length > MAX_STRING_LOG_LEN) {
    return `${out.slice(0, MAX_STRING_LOG_LEN - 1)}…`;
  }
  return out;
}

export type ErrorLogMeta = {
  name?: string;
  message?: string;
  stack?: string;
};

function redactLogValue(value: any): any {
  if (typeof value === "string") {
    return redactSecretsInString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item));
  }
  if (value !== null && typeof value === "object") {
    const output: Record<string, any> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = redactLogValue(nested);
    }
    return output;
  }
  return value;
}

const redactionFormat = format((info) => redactLogValue(info))();

const loggerTransports: Array<
  transports.ConsoleTransportInstance | transports.FileTransportInstance
> = [
  new transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf(({ level, message, timestamp, ...meta }) => {
        const metaJson = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} ${level}: ${message}${metaJson}`;
      }),
    ),
  }),
];

if (canUseFileTransport) {
  loggerTransports.push(
    new transports.File({
      filename: filePath,
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
  );
}

export const logger = createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    redactionFormat,
    format.json(),
  ),
  transports: loggerTransports,
});

