/**
 * Vercel build (monorepo root): bundle proxy API + optionally build admin SPA.
 *
 * Set ENABLE_ADMIN_WEB=false on Vercel to deploy proxy-only (no static panel).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proxyDir = path.join(root, "apps/proxy");
const webDir = path.join(root, "apps/web");
const adminOut = path.join(proxyDir, "public-admin");

function isAdminWebEnabled() {
  const v = process.env.ENABLE_ADMIN_WEB;
  return v !== "false" && v !== "0";
}

execSync("turbo run build:vercel --filter=@proxy/api", {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});

if (isAdminWebEnabled()) {
  execSync("turbo run build --filter=@proxy/web", {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
  fs.rmSync(adminOut, { recursive: true, force: true });
  fs.cpSync(path.join(webDir, "dist"), adminOut, { recursive: true });
  console.log("[vercel-build] Admin panel → apps/proxy/public-admin");
} else {
  fs.rmSync(adminOut, { recursive: true, force: true });
  console.log("[vercel-build] ENABLE_ADMIN_WEB=false — proxy only (no admin SPA)");
}
