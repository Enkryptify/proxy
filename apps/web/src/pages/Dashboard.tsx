import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Gauge, Timer, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { healthApi, statsApi } from "@/lib/api/endpoints";
import { formatDuration, formatNumber } from "@/lib/format";
import { useProxyWorkspace } from "@/lib/workspace";

const HEALTH_REFETCH_MS = 10_000;
const STATS_REFETCH_MS = 30_000;

export function Dashboard() {
  const workspace = useProxyWorkspace();

  const health = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.get,
    refetchInterval: HEALTH_REFETCH_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const stats = useQuery({
    queryKey: ["stats", { windowHours: 24 }],
    queryFn: () => statsApi.get({ windowHours: 24 }),
    refetchInterval: STATS_REFETCH_MS,
    enabled: workspace.isSuccess,
  });

  const proxyReachable = health.isSuccess && health.data.status === "ok";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          workspace.isSuccess
            ? `Statistics for workspace "${workspace.data.workspaceName}" — last 24 hours`
            : "Statistics — last 24 hours"
        }
        actions={
          health.isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <Badge variant={proxyReachable ? "success" : "destructive"}>
              {proxyReachable ? "Proxy online" : "Proxy offline"}
            </Badge>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Gauge}
          label="Requests"
          value={stats.isSuccess ? formatNumber(stats.data.totalRequests) : null}
          hint={
            stats.isSuccess
              ? `${formatNumber(stats.data.successCount)} success • ${formatNumber(stats.data.failureCount)} failed`
              : undefined
          }
        />
        <StatTile
          icon={CheckCircle2}
          label="Success rate"
          value={
            stats.isSuccess && stats.data.totalRequests > 0
              ? `${((stats.data.successCount / stats.data.totalRequests) * 100).toFixed(1)}%`
              : stats.isSuccess
              ? "—"
              : null
          }
          hint="HTTP 2xx-3xx upstream + no proxy error"
        />
        <StatTile
          icon={Timer}
          label="Avg. response time"
          value={stats.isSuccess ? formatDuration(stats.data.avgDurationMs) : null}
          hint={
            stats.isSuccess ? `p95 ${formatDuration(stats.data.p95DurationMs)}` : undefined
          }
        />
        <StatTile
          icon={TriangleAlert}
          label="Failed requests"
          value={stats.isSuccess ? formatNumber(stats.data.failureCount) : null}
          hint="Includes SSRF blocks, whitelist rejects, upstream errors"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proxy status</CardTitle>
          <CardDescription>
            Live data from the proxy <code className="rounded bg-muted px-1 py-0.5">/health</code>{" "}
            endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {health.isError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Cannot reach the proxy. Check that <code>/api/health</code> is available.
            </div>
          ) : health.data ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <Field label="Status" value={health.data.status} />
              <Field label="Runtime" value={health.data.runtime} />
              <Field
                label="Last check"
                value={new Date(health.data.timestamp).toLocaleString()}
              />
            </dl>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gauge;
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {value == null ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
        )}
        {hint ? (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
