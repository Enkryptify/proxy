import { setAccessToken } from "./tokenStore";
import type { SessionResponse } from "@/lib/api/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type RefreshResult =
  | { ok: true; session: SessionResponse }
  | { ok: false };

let inFlight: Promise<RefreshResult> | null = null;
const listeners = new Set<(result: RefreshResult) => void>();

/** Bumped on login/logout so in-flight refresh callbacks cannot overwrite newer auth intent. */
let authEpoch = 0;

export function bumpAuthEpoch(): void {
  authEpoch += 1;
}

/**
 * Single source of truth for refreshing the session.
 *
 * Both the `AuthProvider`'s scheduled silent refresh and the API client's
 * on-401 refresh funnel through here, so concurrent refreshes never race —
 * which is critical because the backend rotates the refresh token on every
 * call: two parallel refreshes would revoke each other's cookie.
 */
export function refreshSession(): Promise<RefreshResult> {
  inFlight ??= (async (): Promise<RefreshResult> => {
    const epochAtStart = authEpoch;
    let result: RefreshResult;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (epochAtStart !== authEpoch) {
        result = { ok: false };
      } else if (!res.ok) {
        result = { ok: false };
      } else {
        const session = (await res.json()) as SessionResponse;
        setAccessToken(session.accessToken, session.accessTokenExpiresAt);
        result = { ok: true, session };
      }
    } catch {
      result = { ok: false };
    } finally {
      // Hand off to a microtask so any caller awaiting `inFlight` settles
      // before we reset the slot for the next call.
      queueMicrotask(() => {
        inFlight = null;
      });
    }
    for (const fn of listeners) fn(result);
    return result;
  })();
  return inFlight;
}

export function subscribeRefresh(fn: (result: RefreshResult) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
