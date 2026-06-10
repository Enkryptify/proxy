import { NavLink } from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProxyWorkspace } from "@/lib/workspace";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/whitelist", label: "Whitelist", icon: ListChecks, end: false },
  { to: "/logs", label: "Audit Logs", icon: ScrollText, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

function userInitials(email: string | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[.\-_\s]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "??").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function Sidebar() {
  const auth = useAuth();
  const workspace = useProxyWorkspace();

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex items-center gap-2 px-6 pb-6 pt-6">
        <img src="/logo.svg" alt="Enkryptify" className="h-6 w-auto" />
        <span className="text-[13px] font-semibold uppercase tracking-tight-wide text-foreground">
          Enkryptify
        </span>
      </div>

      <div className="px-4 pb-6">
        <div
          className="flex items-center justify-between gap-2 border border-border bg-secondary/40 px-3 py-2"
          title={workspace.isSuccess ? `Workspace id: ${workspace.data.workspaceId}` : undefined}
        >
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] uppercase tracking-tight-wide text-muted-foreground">
              Workspace
            </div>
            <div className="truncate text-sm font-medium text-foreground">
              {workspace.isSuccess
                ? workspace.data.workspaceName
                : workspace.isLoading
                ? "Loading..."
                : "Unavailable"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-tight-wide text-muted-foreground">
          Navigation
        </div>
        <nav className="flex flex-col gap-px">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors",
                  "hover:bg-secondary hover:text-foreground",
                  isActive && "bg-secondary text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-1.5 left-0 w-[2px] bg-primary"
                    />
                  ) : null}
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-1" />

      <div className="px-4 pb-4">
        <a
          href="https://docs.enkryptify.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <span className="flex items-center gap-3">
            <BookOpen className="h-4 w-4" aria-hidden />
            Documentation
          </span>
          <span aria-hidden className="text-muted-foreground">
            ↗
          </span>
        </a>
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold uppercase text-foreground">
            {userInitials(auth.status === "authenticated" ? auth.user.email : undefined)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div
              className="truncate text-sm font-medium text-foreground"
              title={auth.status === "authenticated" ? auth.user.email : undefined}
            >
              {auth.status === "authenticated" ? auth.user.email : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-tight-wide text-muted-foreground">
              Signed in
            </div>
          </div>
          <button
            type="button"
            onClick={() => void auth.logout()}
            aria-label="Sign out"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
