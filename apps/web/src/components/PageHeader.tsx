import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  if (!title && !description && !actions) return null;

  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="space-y-1">
        {title ? (
          <h2 className="text-base font-medium tracking-tight text-foreground">{title}</h2>
        ) : null}
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
