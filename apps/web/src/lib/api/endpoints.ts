import { api } from "./client";
import type {
  HealthStatus,
  LogsPage,
  SessionResponse,
  Stats,
  User,
  WhitelistEntry,
  WhitelistList,
  WorkspaceIdentity,
  WorkspaceSettings,
} from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<SessionResponse>("/api/auth/login", { email, password }),
  refresh: () => api.post<SessionResponse>("/api/auth/refresh"),
  logout: () => api.post<{ ok: true }>("/api/auth/logout"),
  me: () => api.get<User>("/api/auth/me"),
};

export const healthApi = {
  get: () => api.get<HealthStatus>("/api/health"),
};

/**
 * Workspace this proxy is bound to. Resolved server-side from PROXY_KEY,
 * so the panel renders a read-only workspace header instead of asking the
 * user to pick one.
 */
export const workspaceApi = {
  me: () => api.get<WorkspaceIdentity>("/api/admin/me/workspace"),
};

export const statsApi = {
  get: (params: { windowHours?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.windowHours !== undefined) {
      q.set("windowHours", String(params.windowHours));
    }
    const qs = q.toString();
    return api.get<Stats>(`/api/admin/stats${qs ? `?${qs}` : ""}`);
  },
};

export const logsApi = {
  list: (params: { page: number; pageSize: number }) => {
    const q = new URLSearchParams();
    q.set("page", String(params.page));
    q.set("pageSize", String(params.pageSize));
    return api.get<LogsPage>(`/api/admin/logs?${q.toString()}`);
  },
};

export const whitelistApi = {
  list: () => api.get<WhitelistList>("/api/admin/whitelist"),
  add: (hostname: string) =>
    api.post<WhitelistEntry>("/api/admin/whitelist", { hostname }),
  remove: (id: string) =>
    api.delete<{ ok: true }>(`/api/admin/whitelist/${encodeURIComponent(id)}`),
};

export const settingsApi = {
  get: () => api.get<WorkspaceSettings>("/api/admin/settings"),
  update: (whitelistMode: boolean) =>
    api.patch<WorkspaceSettings>("/api/admin/settings", { whitelistMode }),
};
