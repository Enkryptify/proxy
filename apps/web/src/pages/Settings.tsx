import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { WorkspaceRequired } from "@/components/WorkspaceRequired";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { settingsApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { useProxyWorkspace } from "@/lib/workspace";

export function Settings() {
  const workspace = useProxyWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
    enabled: workspace.isSuccess,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      void queryClient.invalidateQueries({ queryKey: ["whitelist"] });
      toast({
        title: data.whitelistMode ? "Whitelist mode enabled" : "Whitelist mode disabled",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not update setting",
        description: err instanceof ApiError ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  if (!workspace.isSuccess) {
    return (
      <>
        <PageHeader description="Workspace settings." />
        <WorkspaceRequired />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={`Settings for workspace "${workspace.data.workspaceName}".`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Whitelist mode</CardTitle>
          <CardDescription>
            When enabled, the proxy blocks every request to an upstream hostname that is not
            on this workspace's whitelist. When disabled, the whitelist is not enforced and all
            hostnames are allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {query.isError ? (
            <span className="text-sm text-destructive">
              {query.error instanceof ApiError ? query.error.message : "Could not load settings"}
            </span>
          ) : query.data ? (
            <>
              <Switch
                id="whitelist-mode-settings"
                checked={query.data.whitelistMode}
                disabled={mutation.isPending}
                onCheckedChange={(checked) => mutation.mutate(checked)}
              />
              <Label htmlFor="whitelist-mode-settings" className="cursor-pointer">
                {query.data.whitelistMode ? "Enabled" : "Disabled"}
              </Label>
            </>
          ) : (
            <Skeleton className="h-6 w-12" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
