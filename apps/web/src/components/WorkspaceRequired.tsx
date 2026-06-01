import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspaceRequired() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecteer eerst een werkruimte</CardTitle>
        <CardDescription>
          Vul rechtsboven een werkruimte-naam in om deze pagina te gebruiken.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
