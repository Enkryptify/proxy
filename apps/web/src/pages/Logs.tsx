import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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
import type { LogEntry } from "@/lib/api/types";
import { formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useProxyWorkspace } from "@/lib/workspace";

const PAGE_SIZE = 25;

function statusVariant(code: number, outcome: "success" | "failure") {
  if (outcome === "failure") return "destructive" as const;
  if (code >= 500) return "destructive" as const;
  if (code >= 400) return "warning" as const;
  return "success" as const;
}

export function Logs() {
  const workspace = useProxyWorkspace();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["logs", { page, pageSize: PAGE_SIZE }],
    queryFn: () => logsApi.list({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: workspace.isSuccess,
  });

  useEffect(() => {
    setExpandedId(null);
  }, [page]);

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description={
          workspace.isSuccess
            ? `Recent proxy traffic for workspace "${workspace.data.workspaceName}"`
            : "Recent proxy traffic"
        }
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-4 text-sm text-destructive">
              {query.error instanceof ApiError ? query.error.message : "Could not load logs"}
            </div>
          ) : !query.data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : query.data.items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No log entries found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>When</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Keys</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((row) => {
                  const isOpen = expandedId === row.id;
                  return (
                    <LogRow
                      key={row.id}
                      row={row}
                      isOpen={isOpen}
                      onToggle={() => setExpandedId(isOpen ? null : row.id)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {query.isSuccess
            ? `Page ${page} of ${totalPages} (${total.toLocaleString()} total)`
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
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || query.isFetching}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LogRow({
  row,
  isOpen,
  onToggle,
}: {
  row: LogEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn("cursor-pointer", isOpen && "bg-muted/40")}
      >
        <TableCell className="pr-0 text-muted-foreground">
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </TableCell>
        <TableCell>
          <div className="font-medium">{row.project}</div>
        </TableCell>
        <TableCell className="font-mono">{row.targetHost}</TableCell>
        <TableCell>
          <Badge variant={statusVariant(row.statusCode, row.outcome)}>{row.statusCode}</Badge>
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
      {isOpen && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="p-4">
            <LogDetails row={row} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function LogDetails({ row }: { row: LogEntry }) {
  return (
    <div className="space-y-3 text-sm">
      {row.errorMessage ? (
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Error
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words bg-background p-3 font-mono text-xs text-destructive">
            {row.errorMessage}
          </pre>
        </div>
      ) : (
        <div className="text-muted-foreground">
          {row.outcome === "success"
            ? "Request completed successfully — no error recorded."
            : "No error message recorded for this request."}
        </div>
      )}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        <DetailField label="Log ID" value={row.id} mono />
        <DetailField label="Environment ID" value={row.environmentId} mono />
        <DetailField label="Workspace ID" value={row.workspace} mono />
        <DetailField label="Outcome" value={row.outcome} />
      </dl>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("break-all", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
