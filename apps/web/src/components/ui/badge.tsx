import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";


const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-tight-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-foreground",
        secondary: "border-border bg-secondary text-muted-foreground",
        outline: "border-border text-foreground",
        success:
          "border-success/40 bg-success/5 text-success",
        info:
          "border-info/40 bg-info/5 text-info",
        warning:
          "border-warning/40 bg-warning/5 text-warning",
        destructive:
          "border-destructive/40 bg-destructive/5 text-destructive",
        brand:
          "border-primary/40 bg-primary/5 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
