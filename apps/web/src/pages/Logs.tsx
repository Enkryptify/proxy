import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { logsApi } from "@/lib/api/endpoints";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useSelectedWorkspace } from "@/lib/workspace";

const PAGE_SIZE = 25;

function statusVariant(code: number, outcome: "success" | "failure") {
  if (outcome === "failure") return "destructive" as const;
  if (code >= 500) return "destructive" as const;
  if (code >= 400) return "warning" as const;
  return "success" as const;
}

export function Logs() {
  const [workspace] = useSelectedWorkspace();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["logs", { workspace, page, pageSize: PAGE_SIZE }],
    queryFn: () =>
      logsApi.list({ page, pageSize: PAGE_SIZE, workspace: workspace || undefined }),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logboek"
        description={
          workspace
            ? `Recente doorsturingen voor werkruimte "${workspace}"`
            : "Recente doorsturingen voor alle werkruimten"
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Verversen
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-4 text-sm text-destructive">
              {query.error instanceof ApiError ? query.error.message : "Kon logboek niet laden"}
            </div>
          ) : !query.data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : query.data.items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Geen logregels gevonden.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tijdstip</TableHead>
                  <TableHead>Werkruimte / project</TableHead>
                  <TableHead>Bestemming</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duur</TableHead>
                  <TableHead>Sleutels</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.workspace}</div>
                      <div className="text-xs text-muted-foreground">{row.project}</div>
                    </TableCell>
                    <TableCell className="font-mono">{row.targetHost}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.statusCode, row.outcome)}>
                        {row.statusCode}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDuration(row.durationMs)}</TableCell>
                    <TableCell>
                      {row.placeholderKeys.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.placeholderKeys.map((key) => (
                            <Badge key={key} variant="outline" className="font-mono text-xs">
                              {key}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {query.isSuccess
            ? `Pagina ${page} van ${totalPages} (${total.toLocaleString()} totaal)`
            : "..."}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || query.isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
            Vorige
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || query.isFetching}
          >
            Volgende
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
