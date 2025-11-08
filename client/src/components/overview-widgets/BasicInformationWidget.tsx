import { Card, CardContent } from "@/components/ui/card";
import { FileText, MapPin, DollarSign, Calendar, Briefcase } from "lucide-react";
import type { ProjectWithRoads } from "@shared/schema";

interface BasicInformationWidgetProps {
  project: ProjectWithRoads;
}

export default function BasicInformationWidget({ project }: BasicInformationWidgetProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (value: string | number | null | undefined) => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Project ID</p>
            <p className="font-medium" data-testid="text-project-id">{project.projectNumber || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium" data-testid="text-location">{project.location}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium" data-testid="text-start-date">{formatDate(project.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium" data-testid="text-end-date">{formatDate(project.endDate)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
