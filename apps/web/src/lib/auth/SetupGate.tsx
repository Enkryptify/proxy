import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api/endpoints";
import { SETUP_STATUS_QUERY_KEY } from "./setup";

export function SetupGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const onSetup = location.pathname === "/setup";

  const { data, isLoading, isError } = useQuery({
    queryKey: SETUP_STATUS_QUERY_KEY,
    queryFn: () => authApi.setupStatus(),
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
          aria-hidden
        />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!isError && data?.needsSetup && !onSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (!isError && data && !data.needsSetup && onSetup) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
