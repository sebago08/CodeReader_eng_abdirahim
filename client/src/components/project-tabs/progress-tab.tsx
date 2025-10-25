import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";

interface ProjectProgressTabProps {
  projectId: string;
}

export default function ProjectProgressTab({ projectId }: ProjectProgressTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Progress Tracking</h2>
          <p className="text-muted-foreground text-sm mt-1">Monitor payments, personnel, equipment, and issues</p>
        </div>
        <Button data-testid="button-add-progress-item" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Placeholder - Will be implemented in Task 5 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
            <div>
              <CardTitle>Progress Management</CardTitle>
              <CardDescription>Track payments, team members, equipment, and project issues</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Coming Soon</p>
            <p className="text-sm">Progress tracking features will be available in the next release</p>
            <p className="text-xs mt-4">Features: Payment certificates, contractor personnel & equipment, client personnel, and issues tracking</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
