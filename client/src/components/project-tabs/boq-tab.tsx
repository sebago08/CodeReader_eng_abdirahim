import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet } from "lucide-react";

interface ProjectBOQTabProps {
  projectId: string;
}

export default function ProjectBOQTab({ projectId }: ProjectBOQTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bill of Quantities</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage project BOQ with hierarchical items</p>
        </div>
        <Button data-testid="button-create-boq">
          <Plus className="w-4 h-4 mr-2" />
          Create BOQ
        </Button>
      </div>

      {/* Placeholder - Will be implemented in Task 4 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
            <div>
              <CardTitle>BOQ Management</CardTitle>
              <CardDescription>Spreadsheet-style editor with hierarchical structure</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>BOQ spreadsheet editor will be implemented in Task 4</p>
            <p className="text-sm mt-2">Features: Sections, subsections, line items, quantities, rates, and amounts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
