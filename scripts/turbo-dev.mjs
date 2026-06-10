/**
 * Local dev via Turbo: proxy always; admin panel only when ENABLE_ADMIN_WEB is not false.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v = process.env.ENABLE_ADMIN_WEB;
const webEnabled = v !== "false" && v !== "0";

const cmd = webEnabled
  ? "turbo dev"
  : "turbo dev --filter=@proxy/api";

console.log(
  webEnabled
    ? "[dev] Starting proxy + admin panel (set ENABLE_ADMIN_WEB=false for proxy only)"
    : "[dev] Starting proxy only (ENABLE_ADMIN_WEB=false)",
);

execSync(cmd, { stdio: "inherit", cwd: root, env: process.env });
