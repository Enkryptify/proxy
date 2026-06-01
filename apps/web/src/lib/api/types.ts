// Shared response shapes — kept manually in sync with the Zod schemas in
// `apps/proxy/src/modules/v1/{auth,admin,proxy}/...schemas.ts`.

export type HealthStatus = {
  status: "ok";
  timestamp: string;
  runtime: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
};

export type SessionResponse = {
  accessToken: string;
  /** Unix seconds. */
  accessTokenExpiresAt: number;
  user: User;
};

export type Stats = {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
  windowHours: number;
  generatedAt: string;
};

export type LogEntry = {
  id: string;
  createdAt: string;
  workspace: string;
  project: string;
  environmentId: string;
  targetHost: string;
  statusCode: number;
  outcome: "success" | "failure";
  durationMs: number;
  placeholderKeys: string[];
};

export type LogsPage = {
  items: LogEntry[];
  page: number;
  pageSize: number;
  total: number;
};

export type WhitelistEntry = {
  id: string;
  workspace: string;
  hostname: string;
  addedBy: string | null;
  createdAt: string;
};

export type WhitelistList = {
  items: WhitelistEntry[];
  whitelistMode: boolean;
};

export type WorkspaceSettings = {
  workspace: string;
  whitelistMode: boolean;
};

/**
 * Identity of the workspace this proxy is bound to (resolved server-side
 * from `PROXY_KEY`). The admin panel only knows about one workspace at a
 * time — there is no workspace picker on the UI.
 */
export type WorkspaceIdentity = {
  workspaceId: string;
  workspaceName: string;
};

export type ApiErrorBody = {
  error: string;
};
