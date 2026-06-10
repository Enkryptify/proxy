import { useLocation } from "react-router-dom";
import { useProxyWorkspace } from "@/lib/workspace";

const SEGMENT_LABELS: Record<string, string> = {
  "": "Overview",
  whitelist: "Whitelist",
  logs: "Audit Logs",
  settings: "Settings",
};

function pageLabel(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  return SEGMENT_LABELS[segment] ?? segment.replace(/-/g, " ");
}

export function Topbar() {
  const location = useLocation();
  const workspace = useProxyWorkspace();
  const page = pageLabel(location.pathname);

  const workspaceLabel = workspace.isSuccess
    ? workspace.data.workspaceName
    : workspace.isLoading
    ? "Loading..."
    : "—";

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-6">
      <div aria-hidden className="h-1.5 w-1.5 bg-primary" />
      <h1 className="flex items-baseline gap-2 text-[13px] uppercase tracking-tight-wide">
        <span
          className="text-foreground"
          title={workspace.isSuccess ? `Workspace id: ${workspace.data.workspaceId}` : undefined}
        >
          {workspaceLabel}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground">{page}</span>
      </h1>
    </header>
  );
}
