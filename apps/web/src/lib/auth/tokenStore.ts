/**
 * In-memory access-token store.
 *
 * We deliberately do **not** persist to localStorage or sessionStorage:
 * a successful XSS would otherwise let an attacker exfiltrate a long-lived
 * bearer credential. Instead, the JWT lives only in this closure, and the
 * `AuthProvider` calls `POST /api/auth/refresh` against the httpOnly refresh
 * cookie on cold start to restore the session.
 */
type Token = { value: string; expiresAt: number } | null;

let current: Token = null;
const listeners = new Set<(t: Token) => void>();

export function getAccessToken(): string | null {
  if (!current) return null;
  // Treat as missing if it expires in <5s so we don't ship a doomed token.
  const skew = Math.floor(Date.now() / 1000) + 5;
  if (current.expiresAt <= skew) return null;
  return current.value;
}

export function getAccessTokenExpiresAt(): number | null {
  return current?.expiresAt ?? null;
}

export function setAccessToken(token: string | null, expiresAt: number | null): void {
  if (token && expiresAt) {
    current = { value: token, expiresAt };
  } else {
    current = null;
  }
  for (const fn of listeners) fn(current);
}

export function subscribeAccessToken(fn: (t: Token) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
