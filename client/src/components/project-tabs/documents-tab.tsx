import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

interface ProjectDocumentsTabProps {
  projectId: string;
}

export default function ProjectDocumentsTab({ projectId }: ProjectDocumentsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Documents</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate and manage project documents</p>
        </div>
        <Button data-testid="button-create-document" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Create Document
        </Button>
      </div>

      {/* Placeholder - Will be implemented in Task 5 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <div>
              <CardTitle>Document Generation</CardTitle>
              <CardDescription>Create progress reports, certificates, orders, letters, and meeting minutes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Coming Soon</p>
            <p className="text-sm">Document generation and management features will be available in the next release</p>
            <p className="text-xs mt-4">Features: Progress reports, payment certificates, work orders, project letters, and meeting minutes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
