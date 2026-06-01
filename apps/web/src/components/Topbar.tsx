import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProxyWorkspace } from "@/lib/workspace";

export function Topbar() {
  const auth = useAuth();
  const workspace = useProxyWorkspace();

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
      <div className="flex flex-1 items-center gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Werkruimte
        </div>
        <div
          className="text-sm font-medium text-foreground"
          title={workspace.isSuccess ? `Workspace id: ${workspace.data.workspaceId}` : undefined}
        >
          {workspace.isSuccess
            ? workspace.data.workspaceName
            : workspace.isLoading
            ? "Laden..."
            : "—"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {auth.status === "authenticated" ? (
          <div className="hidden text-right text-xs leading-tight sm:block">
            <div className="font-medium text-foreground">{auth.user.username}</div>
            <div className="text-muted-foreground">{auth.user.email}</div>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void auth.logout()}
          aria-label="Uitloggen"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Uitloggen</span>
        </Button>
      </div>
    </header>
  );
}
