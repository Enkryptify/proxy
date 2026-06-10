import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl font-bold tracking-tight">404</div>
      <p className="text-sm text-muted-foreground">This page does not exist.</p>
      <Button asChild>
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  );
}
