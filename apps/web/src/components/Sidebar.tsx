import { NavLink } from "react-router-dom";
import { Activity, KeyRound, ListChecks, ScrollText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: Activity, end: true },
  { to: "/whitelist", label: "Whitelist", icon: ListChecks, end: false },
  { to: "/logs", label: "Logboek", icon: ScrollText, end: false },
  { to: "/settings", label: "Instellingen", icon: Settings, end: false },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card/40 px-3 py-6 lg:flex lg:flex-col">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <KeyRound className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Proxy</div>
          <div className="text-xs text-muted-foreground">Admin Panel</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
