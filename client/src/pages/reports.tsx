import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Reports() {
  return (
    <AppLayout breadcrumb={<h1 className="text-xl font-semibold">Reports</h1>}>
      <div className="p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Reports & Analytics</CardTitle>
                <CardDescription>Coming soon - Project reports and analytics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section will include comprehensive reports on project progress, financial analytics, 
              resource utilization, and performance metrics.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
