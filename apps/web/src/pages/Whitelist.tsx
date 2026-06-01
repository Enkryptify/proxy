import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Plus, ShieldOff, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WorkspaceRequired } from "@/components/WorkspaceRequired";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { whitelistApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { formatRelative } from "@/lib/format";
import { useProxyWorkspace } from "@/lib/workspace";

const hostnameSchema = z.object({
  hostname: z
    .string()
    .trim()
    .min(1, "Enter a hostname")
    .max(253)
    .regex(
      /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})+$/,
      "Not a valid hostname",
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
      toast({ title: "Host added" });
    },
    onError: (err) => {
      toast({
        title: "Could not add hostname",
        description: err instanceof ApiError ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => whitelistApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["whitelist"] });
      toast({ title: "Host removed" });
    },
    onError: (err) => {
      toast({
        title: "Could not remove host",
        description: err instanceof ApiError ? err.message : "Unknown error",
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
        <PageHeader description="Approved hostnames per workspace." />
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
        description={`Approved upstream hostnames for workspace "${workspace.data.workspaceName}".`}
        actions={
          listQuery.isSuccess ? (
            <Badge variant={listQuery.data.whitelistMode ? "success" : "secondary"}>
              {listQuery.data.whitelistMode ? "Whitelist mode active" : "Whitelist mode off"}
            </Badge>
          ) : null
        }
      />

      {listQuery.isSuccess && !listQuery.data.whitelistMode ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldOff
                aria-hidden
                className="mt-0.5 h-5 w-5 shrink-0 text-warning"
              />
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">
                  Whitelist mode is off
                </div>
                <div className="text-sm text-muted-foreground">
                  The proxy accepts every upstream hostname for this workspace. The list
                  below is informational only until you enable whitelist mode in settings.
                </div>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="sm:self-center">
              <Link to="/settings">
                Go to settings
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Add hostname</CardTitle>
          <CardDescription>FQDN without scheme or path, e.g. <code>api.example.com</code>.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={onSubmit} noValidate>
            <div className="relative flex-1">
              <Input
                id="hostname"
                placeholder="api.example.com"
                aria-label="Hostname"
                {...form.register("hostname")}
                aria-invalid={form.formState.errors.hostname ? true : undefined}
              />
              {form.formState.errors.hostname ? (
                <p className="absolute left-0 top-full mt-1 text-xs text-destructive">
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
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved hostnames</CardTitle>
          <CardDescription>
            {listQuery.isSuccess
              ? `${listQuery.data.items.length} ${listQuery.data.items.length === 1 ? "host" : "hosts"}`
              : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {listQuery.isError ? (
            <div className="p-4 text-sm text-destructive">
              {listQuery.error instanceof ApiError
                ? listQuery.error.message
                : "Could not load whitelist"}
            </div>
          ) : !listQuery.data ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : listQuery.data.items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No hostnames added yet for this workspace.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Actions" />
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
                        aria-label={`Remove ${row.hostname}`}
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
