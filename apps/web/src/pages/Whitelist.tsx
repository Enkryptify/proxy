import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WorkspaceRequired } from "@/components/WorkspaceRequired";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { settingsApi, whitelistApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { formatRelative } from "@/lib/format";
import { useProxyWorkspace } from "@/lib/workspace";

const hostnameSchema = z.object({
  hostname: z
    .string()
    .trim()
    .min(1, "Vul een hostname in")
    .max(253)
    .regex(
      /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})+$/,
      "Geen geldige hostname",
    ),
});
type HostnameForm = z.infer<typeof hostnameSchema>;

export function Whitelist() {
  const workspace = useProxyWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ["whitelist"],
    queryFn: whitelistApi.list,
    enabled: workspace.isSuccess,
  });

  const addMutation = useMutation({
    mutationFn: whitelistApi.add,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["whitelist"] });
      toast({ title: "Host toegevoegd" });
    },
    onError: (err) => {
      toast({
        title: "Kon hostname niet toevoegen",
        description: err instanceof ApiError ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => whitelistApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["whitelist"] });
      toast({ title: "Host verwijderd" });
    },
    onError: (err) => {
      toast({
        title: "Kon host niet verwijderen",
        description: err instanceof ApiError ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (data) => {
      queryClient.setQueryData<typeof listQuery.data>(["whitelist"], (prev) =>
        prev ? { ...prev, whitelistMode: data.whitelistMode } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
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

  const form = useForm<HostnameForm>({
    resolver: zodResolver(hostnameSchema),
    defaultValues: { hostname: "" },
  });

  if (!workspace.isSuccess) {
    return (
      <>
        <PageHeader
          title="Whitelist"
          description="Goedgekeurde hostnamen per werkruimte."
        />
        <WorkspaceRequired />
      </>
    );
  }

  const onSubmit = form.handleSubmit(async ({ hostname }) => {
    await addMutation.mutateAsync(hostname.toLowerCase());
    form.reset();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Whitelist"
        description={`Goedgekeurde upstream-hostnamen voor werkruimte "${workspace.data.workspaceName}".`}
        actions={
          listQuery.isSuccess ? (
            <Badge variant={listQuery.data.whitelistMode ? "success" : "secondary"}>
              {listQuery.data.whitelistMode ? "Whitelistmodus actief" : "Whitelistmodus uit"}
            </Badge>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Whitelistmodus</CardTitle>
          <CardDescription>
            Wanneer aan, weigert de proxy verzoeken naar hostnamen die niet in de lijst staan
            (HTTP 403). Wanneer uit, dient de lijst alleen voor administratie.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            id="whitelist-mode"
            disabled={listQuery.isLoading || toggleMutation.isPending}
            checked={listQuery.data?.whitelistMode ?? false}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          />
          <Label htmlFor="whitelist-mode" className="cursor-pointer">
            {listQuery.data?.whitelistMode ? "Ingeschakeld" : "Uitgeschakeld"}
          </Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hostname toevoegen</CardTitle>
          <CardDescription>FQDN zonder schema of pad, bv. <code>api.example.com</code>.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-start" onSubmit={onSubmit} noValidate>
            <div className="flex-1 space-y-2">
              <Label htmlFor="hostname" className="sr-only">
                Hostname
              </Label>
              <Input
                id="hostname"
                placeholder="api.example.com"
                {...form.register("hostname")}
                aria-invalid={form.formState.errors.hostname ? true : undefined}
              />
              {form.formState.errors.hostname ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.hostname.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Toevoegen
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goedgekeurde hostnamen</CardTitle>
          <CardDescription>
            {listQuery.isSuccess
              ? `${listQuery.data.items.length} ${listQuery.data.items.length === 1 ? "host" : "hosts"}`
              : "Laden..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {listQuery.isError ? (
            <div className="p-4 text-sm text-destructive">
              {listQuery.error instanceof ApiError
                ? listQuery.error.message
                : "Kon whitelist niet laden"}
            </div>
          ) : !listQuery.data ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : listQuery.data.items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nog geen hostnamen toegevoegd voor deze werkruimte.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Toegevoegd door</TableHead>
                  <TableHead>Wanneer</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acties" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">{row.hostname}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.addedBy ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Verwijder ${row.hostname}`}
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
