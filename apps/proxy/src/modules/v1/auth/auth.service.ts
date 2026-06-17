import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/plugins/db";
import { refreshToken, user } from "@/lib/schemas";
import {
  BadGatewayError,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/utils/errors";
import {
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/utils/tokens";
import type { BootstrapRequest, IssuedSession, LoginRequest, MeResponse, SetupStatus, UserRole } from "./auth.schemas";

/** Serialize first-user bootstrap across concurrent requests. */
const SETUP_ADVISORY_LOCK_KEY = 0x505853;

function assertDb() {
  if (!db) {
    throw new BadGatewayError(
      "Admin panel requires DATABASE_URL to be configured on the proxy",
    );
  }
  return db;
}

/** Pre-computed argon2 hash used to keep login timing roughly constant when a user is not found. */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= Bun.password.hash("not-a-real-password-used-for-timing-only");
  return dummyHashPromise;
}

export default class AuthService {
  async login(
    input: LoginRequest,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<IssuedSession> {
    const database = assertDb();
    const row = await database.query.user.findFirst({
      where: eq(user.email, input.email.toLowerCase()),
    });

    const passwordHash = row?.password ?? (await getDummyHash());
    const ok = await Bun.password.verify(input.password, passwordHash);
    if (!row || !ok) {
      throw new UnauthorizedError("Invalid email or password");
    }
    if (row.role !== "admin") {
      throw new ForbiddenError("Account does not have admin access");
    }

    return this.#issueSession(
      {
        sub: row.id,
        email: row.email,
        username: row.username,
        role: row.role,
      },
      meta,
    );
  }

  async refresh(
    rawToken: string | undefined,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<IssuedSession> {
    if (!rawToken) throw new UnauthorizedError("Missing refresh cookie");
    const database = assertDb();
    const payload = await verifyRefreshToken(rawToken);
    const tokenHash = await hashRefreshToken(rawToken);

    // Atomically claim the refresh row so concurrent requests cannot both rotate.
    const [claimed] = await database
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(
        and(
          eq(refreshToken.tokenHash, tokenHash),
          eq(refreshToken.isRevoked, false),
          gt(refreshToken.expiresAt, new Date()),
        ),
      )
      .returning({ userId: refreshToken.userId });

    if (!claimed) {
      throw new UnauthorizedError("Refresh token revoked or expired");
    }
    if (claimed.userId !== payload.sub) {
      throw new UnauthorizedError("Refresh token mismatch");
    }

    const userRow = await database.query.user.findFirst({
      where: eq(user.id, payload.sub),
    });
    if (!userRow || userRow.role !== "admin") {
      throw new UnauthorizedError("User no longer authorized");
    }

    return this.#issueSession(
      {
        sub: userRow.id,
        email: userRow.email,
        username: userRow.username,
        role: userRow.role,
      },
      meta,
    );
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const database = assertDb();
    const tokenHash = await hashRefreshToken(rawToken);
    await database
      .update(refreshToken)
      .set({ isRevoked: true })
      .where(eq(refreshToken.tokenHash, tokenHash));
  }

  async me(userId: string): Promise<MeResponse> {
    const database = assertDb();
    const row = await database.query.user.findFirst({ where: eq(user.id, userId) });
    if (!row) throw new UnauthorizedError("User not found");
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role,
    };
  }

  async setupStatus(): Promise<SetupStatus> {
    const database = assertDb();
    const existing = await database.query.user.findFirst({ columns: { id: true } });
    return { needsSetup: !existing };
  }

  async bootstrap(
    input: BootstrapRequest,
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<IssuedSession> {
    const database = assertDb();
    await database.execute(sql`SELECT pg_advisory_lock(${SETUP_ADVISORY_LOCK_KEY})`);
    try {
      const existing = await database.query.user.findFirst({ columns: { id: true } });
      if (existing) {
        throw new ForbiddenError("An admin account already exists");
      }

      const passwordHash = await Bun.password.hash(input.password, {
        algorithm: "argon2id",
      });
      const [row] = await database
        .insert(user)
        .values({
          userId: crypto.randomUUID(),
          email: input.email.toLowerCase(),
          username: input.username,
          password: passwordHash,
          role: "admin",
          mustChangePassword: false,
        })
        .returning({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        });

      return this.#issueSession(
        {
          sub: row.id,
          email: row.email,
          username: row.username,
          role: row.role,
        },
        meta,
      );
    } finally {
      await database.execute(sql`SELECT pg_advisory_unlock(${SETUP_ADVISORY_LOCK_KEY})`);
    }
  }

  async #issueSession(
    user: { sub: string; email: string; username: string; role: UserRole },
    meta: { userAgent: string | null; ipAddress: string | null },
  ): Promise<IssuedSession> {
    const database = assertDb();
    const sid = crypto.randomUUID();

    const access = await signAccessToken({
      sub: user.sub,
      email: user.email,
      role: user.role,
      sid,
    });
    const refresh = await signRefreshToken({ sub: user.sub, sid });

    await database.insert(refreshToken).values({
      userId: user.sub,
      tokenHash: await hashRefreshToken(refresh.token),
      expiresAt: new Date(refresh.expiresAt * 1000),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: {
        id: user.sub,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }
}
