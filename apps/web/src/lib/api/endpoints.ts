import { api } from "./client";
import type {
  HealthStatus,
  LogsPage,
  SessionResponse,
  Stats,
  User,
  WhitelistEntry,
  WhitelistList,
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

export const statsApi = {
  get: (params: { windowHours?: number; workspace?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.windowHours !== undefined) {
      q.set("windowHours", String(params.windowHours));
    }
    if (params.workspace) q.set("workspace", params.workspace);
    const qs = q.toString();
    return api.get<Stats>(`/api/admin/stats${qs ? `?${qs}` : ""}`);
  },
};

export const logsApi = {
  list: (params: { page: number; pageSize: number; workspace?: string }) => {
    const q = new URLSearchParams();
    q.set("page", String(params.page));
    q.set("pageSize", String(params.pageSize));
    if (params.workspace) q.set("workspace", params.workspace);
    return api.get<LogsPage>(`/api/admin/logs?${q.toString()}`);
  },
};

export const whitelistApi = {
  list: (workspace: string) =>
    api.get<WhitelistList>(`/api/admin/whitelist?workspace=${encodeURIComponent(workspace)}`),
  add: (workspace: string, hostname: string) =>
    api.post<WhitelistEntry>("/api/admin/whitelist", { workspace, hostname }),
  remove: (id: string) => api.delete<{ ok: true }>(`/api/admin/whitelist/${id}`),
};

export const settingsApi = {
  get: (workspace: string) =>
    api.get<WorkspaceSettings>(`/api/admin/settings/${encodeURIComponent(workspace)}`),
  update: (workspace: string, whitelistMode: boolean) =>
    api.patch<WorkspaceSettings>(`/api/admin/settings/${encodeURIComponent(workspace)}`, {
      whitelistMode,
    }),
};
