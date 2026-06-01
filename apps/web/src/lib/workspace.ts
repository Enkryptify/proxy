import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { workspaceApi } from "@/lib/api/endpoints";
import type { WorkspaceIdentity } from "@/lib/api/types";

export function useProxyWorkspace() {
  const { isAuthenticated } = useAuth();
  return useQuery<WorkspaceIdentity>({
    queryKey: ["workspace", "me"],
    queryFn: workspaceApi.me,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
