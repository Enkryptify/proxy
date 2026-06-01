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
import { useSelectedWorkspace } from "@/lib/workspace";

export function Settings() {
  const [workspace] = useSelectedWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["settings", workspace],
    queryFn: () => settingsApi.get(workspace),
    enabled: workspace.length > 0,
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => settingsApi.update(workspace, enabled),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings", workspace], data);
      void queryClient.invalidateQueries({ queryKey: ["whitelist", workspace] });
      toast({
        title: data.whitelistMode ? "Whitelistmodus ingeschakeld" : "Whitelistmodus uitgeschakeld",
      });
    },
    onError: (err) => {
      toast({
        title: "Kon instelling niet wijzigen",
        description: err instanceof ApiError ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    },
  });

  if (!workspace) {
    return (
      <>
        <PageHeader title="Instellingen" description="Werkruimte-instellingen." />
        <WorkspaceRequired />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instellingen"
        description={`Instellingen voor werkruimte "${workspace}".`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Whitelistmodus</CardTitle>
          <CardDescription>
            Wanneer ingeschakeld, blokkeert de proxy elke request naar een upstream-hostname die
            niet voorkomt op de whitelist van deze werkruimte. Bij uit: de whitelist wordt niet
            afgedwongen, alle hostnamen zijn toegestaan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {query.isError ? (
            <span className="text-sm text-destructive">
              {query.error instanceof ApiError ? query.error.message : "Kon instellingen niet laden"}
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
                {query.data.whitelistMode ? "Ingeschakeld" : "Uitgeschakeld"}
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
