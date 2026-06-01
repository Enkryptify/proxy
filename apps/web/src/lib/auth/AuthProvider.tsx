import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { setAccessToken } from "./tokenStore";
import { bumpAuthEpoch, refreshSession, subscribeRefresh } from "./refresh";
import type { User } from "@/lib/api/types";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Schedules a silent refresh 60s before the access token expires. */
function msUntilSilentRefresh(expiresAtUnix: number): number {
  const ms = expiresAtUnix * 1000 - Date.now() - 60_000;
  return Math.max(ms, 5_000);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const runRefresh = useCallback(async (): Promise<boolean> => {
    const result = await refreshSession();
    if (result.ok) {
      // Local state is already updated by the subscriber below, but updating it
      // here lets the calling effect proceed without waiting for a re-render.
      setState({ status: "authenticated", user: result.session.user });
      return true;
    }
    setAccessToken(null, null);
    setState({ status: "unauthenticated", user: null });
    clearTimer();
    return false;
  }, [clearTimer]);

  // Whenever *anyone* (this provider or the API client's 401 handler) refreshes
  // the session, mirror the result into local state and re-schedule the timer.
  useEffect(() => {
    const unsubscribe = subscribeRefresh((result) => {
      if (result.ok) {
        setState({ status: "authenticated", user: result.session.user });
        clearTimer();
        refreshTimer.current = setTimeout(
          () => void runRefresh(),
          msUntilSilentRefresh(result.session.accessTokenExpiresAt),
        );
      } else {
        setAccessToken(null, null);
        setState({ status: "unauthenticated", user: null });
        clearTimer();
      }
    });
    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [clearTimer, runRefresh]);

  // Cold-start: try to silently restore a session from the refresh cookie.
  useEffect(() => {
    void runRefresh();
  }, [runRefresh]);

  // Refresh when the tab comes back from background (covers >access-token-ttl idle).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && state.status === "authenticated") {
        void runRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [runRefresh, state.status]);

  const login = useCallback(async (email: string, password: string) => {
    bumpAuthEpoch();
    try {
      const session = await authApi.login(email, password);
      setAccessToken(session.accessToken, session.accessTokenExpiresAt);
      setState({ status: "authenticated", user: session.user });
      clearTimer();
      refreshTimer.current = setTimeout(
        () => void runRefresh(),
        msUntilSilentRefresh(session.accessTokenExpiresAt),
      );
    } catch (err) {
      setAccessToken(null, null);
      setState({ status: "unauthenticated", user: null });
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, "Network error", null);
    }
  }, [clearTimer, runRefresh]);

  const logout = useCallback(async () => {
    bumpAuthEpoch();
    clearTimer();
    try {
      await authApi.logout();
    } catch {
      // ignore — we still drop client state below
    }
    setAccessToken(null, null);
    setState({ status: "unauthenticated", user: null });
  }, [clearTimer]);

  const value: AuthContextValue = { ...state, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
