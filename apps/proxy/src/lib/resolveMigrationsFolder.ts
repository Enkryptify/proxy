import fs from "node:fs";
import path from "node:path";

/** Locate SQL migrations on disk (local dev, Docker, Vercel serverless). */
export function resolveMigrationsFolder(): string | null {
  const candidates = [
    // Copied next to the Vercel bundle during `build:vercel`
    path.join(import.meta.dir, "drizzle"),
    // Monorepo / Docker working directory
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "apps/proxy/drizzle"),
  ];

  const seen = new Set<string>();
  for (const folder of candidates) {
    if (seen.has(folder)) continue;
    seen.add(folder);
    if (fs.existsSync(path.join(folder, "meta", "_journal.json"))) {
      return folder;
    }
  }

  return null;
}
