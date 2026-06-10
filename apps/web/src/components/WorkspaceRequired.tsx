import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { useProxyWorkspace } from "@/lib/workspace";

export function WorkspaceRequired() {
  const query = useProxyWorkspace();

  if (query.isSuccess) return null;

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading workspace...</CardTitle>
          <CardDescription>
            Resolving this proxy's workspace from the Enkryptify vault.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (query.isError) {
    const reason =
      query.error instanceof ApiError
        ? query.error.message
        : query.error instanceof Error
          ? query.error.message
          : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace unavailable</CardTitle>
          <CardDescription>
            The proxy could not resolve its workspace from the Enkryptify vault.
            Make sure <code>PROXY_KEY</code> is configured on the proxy and
            points to a valid workspace, then refresh this page.
          </CardDescription>
        </CardHeader>
        {reason ? (
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              {reason}
            </pre>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  return null;
}
