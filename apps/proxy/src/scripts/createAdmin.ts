/**
 * Create or upgrade an admin user.
 *
 *   bun run src/scripts/createAdmin.ts \
 *     --email admin@example.com \
 *     --username admin \
 *     --password "<strong-pw>"
 */
import { eq } from "drizzle-orm";
import { initDb, db } from "@/plugins/db";
import { user } from "@/lib/schemas";

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx < 0) return undefined;
  const value = process.argv[idx + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

async function main() {
  const email = arg("email")?.toLowerCase();
  const username = arg("username");
  const password = arg("password");

  if (!email || !username || !password) {
    console.error("Usage: --email <email> --username <username> --password <password>");
    process.exit(1);
  }

  await initDb();
  if (!db) {
    console.error("DATABASE_URL is not configured");
    process.exit(1);
  }

  const passwordHash = await Bun.password.hash(password, {
    algorithm: "argon2id",
  });

  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) {
    await db
      .update(user)
      .set({ password: passwordHash, role: "admin", mustChangePassword: false })
      .where(eq(user.id, existing.id));
    console.log(`Updated admin: ${email}`);
  } else {
    await db.insert(user).values({
      userId: crypto.randomUUID(),
      email,
      username,
      password: passwordHash,
      role: "admin",
      mustChangePassword: false,
    });
    console.log(`Created admin: ${email}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
