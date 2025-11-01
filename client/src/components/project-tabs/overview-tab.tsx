import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Edit, 
  MapPin, 
  DollarSign, 
  Calendar, 
  FileText, 
  TrendingUp,
  User,
  Building2,
  Phone,
  Mail,
  MapPinned,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import ProjectModal from "@/components/project-modal";
import { queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import type { PaymentCertificate } from "@shared/schema";
import { Link } from "wouter";

interface OverviewTabProps {
  project: ProjectWithRoads;
}

export default function OverviewTab({ project }: OverviewTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch payment certificates for financial progress (filter by project ID)
  const { data: certificates = [] } = useQuery<PaymentCertificate[]>({
    queryKey: [`/api/payment-certificates?projectId=${project.id}`],
    enabled: !!project.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Completed":
        return "bg-blue-500";
      case "On Hold":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

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

  // Calculate Physical Progress
  const calculatePhysicalProgress = (): number => {
    if (project.projectType === "Road" && project.roads && project.roads.length > 0) {
      // For road projects, calculate based on layer progress
      let totalProgress = 0;
      let totalLayers = 0;

      project.roads.forEach((road) => {
        // Validate road length
        const roadLength = parseFloat(road.length);
        if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
          return; // Skip roads with invalid lengths
        }

        const isDualCarriageway = road.carriageway === 'dual';

        road.layers?.forEach((layer) => {
          totalLayers++;
          if (layer.progress && layer.progress.length > 0) {
            if (isDualCarriageway) {
              // For dual carriageway, calculate LHS and RHS separately and average them
              const lhsProgress = layer.progress
                .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'LHS' || prog.carriagewaySide?.toLowerCase() === 'both')
                .reduce((sum: number, prog: any) => {
                  const start = parseFloat(prog.startChainage as any);
                  const end = parseFloat(prog.endChainage as any);
                  if (isNaN(start) || isNaN(end) || end <= start) return sum;
                  return sum + (end - start);
                }, 0);
              
              const rhsProgress = layer.progress
                .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'RHS' || prog.carriagewaySide?.toLowerCase() === 'both')
                .reduce((sum: number, prog: any) => {
                  const start = parseFloat(prog.startChainage as any);
                  const end = parseFloat(prog.endChainage as any);
                  if (isNaN(start) || isNaN(end) || end <= start) return sum;
                  return sum + (end - start);
                }, 0);
              
              const lhsPercentage = Math.min(100, (lhsProgress / roadLength) * 100);
              const rhsPercentage = Math.min(100, (rhsProgress / roadLength) * 100);
              const layerProgress = (lhsPercentage + rhsPercentage) / 2;
              
              totalProgress += layerProgress;
            } else {
              // For single carriageway, sum all progress
              const completedLength = layer.progress.reduce((sum, prog) => {
                const start = parseFloat(prog.startChainage as any);
                const end = parseFloat(prog.endChainage as any);
                if (isNaN(start) || isNaN(end) || end <= start) return sum;
                return sum + (end - start);
              }, 0);
              const layerProgress = Math.min(100, (completedLength / roadLength) * 100);
              totalProgress += layerProgress;
            }
          }
        });
      });

      return totalLayers > 0 ? Math.round(totalProgress / totalLayers) : 0;
    }
    
    // For non-road projects, would use activities (not implemented in this view)
    return 0;
  };

  // Calculate Financial Progress
  const calculateFinancialProgress = (): number => {
    const contractAmount = project.contractAmount ? parseFloat(project.contractAmount) : 0;
    if (contractAmount === 0) return 0;

    // Sum all certified amounts (pending, in process, and paid)
    const totalCertified = certificates.reduce((sum, cert) => {
      const pending = parseFloat(cert.pendingAmount || "0");
      const inProcess = parseFloat(cert.inProcessAmount || "0");
      const paid = parseFloat(cert.amountPaid || "0");
      return sum + pending + inProcess + paid;
    }, 0);

    return Math.round((totalCertified / contractAmount) * 100);
  };

  // Calculate Time Lapse
  const calculateTimeLapse = (): number => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Handle invalid or zero duration
    if (totalDays <= 0) {
      return 0; // Return 0% for invalid project durations
    }

    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Allow percentage to exceed 100% for overdue projects
    const percentage = Math.round((elapsedDays / totalDays) * 100);
    return Math.max(0, percentage); // Allow values > 100% to show overdue status
  };

  // Calculate overall progress for each road (for condensed tracker)
  const calculateRoadProgress = (road: any): number => {
    if (!road.layers || road.layers.length === 0) return 0;

    // Validate road length
    const roadLength = parseFloat(road.length);
    if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
      return 0; // Return 0% for roads with invalid lengths
    }

    let totalProgress = 0;
    const isDualCarriageway = road.carriageway === 'dual';

    road.layers.forEach((layer: any) => {
      if (layer.progress && layer.progress.length > 0) {
        if (isDualCarriageway) {
          // For dual carriageway, calculate LHS and RHS separately and average them
          const lhsProgress = layer.progress
            .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'LHS' || prog.carriagewaySide?.toLowerCase() === 'both')
            .reduce((sum: number, prog: any) => {
              const start = parseFloat(prog.startChainage);
              const end = parseFloat(prog.endChainage);
              if (isNaN(start) || isNaN(end) || end <= start) return sum;
              return sum + (end - start);
            }, 0);
          
          const rhsProgress = layer.progress
            .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'RHS' || prog.carriagewaySide?.toLowerCase() === 'both')
            .reduce((sum: number, prog: any) => {
              const start = parseFloat(prog.startChainage);
              const end = parseFloat(prog.endChainage);
              if (isNaN(start) || isNaN(end) || end <= start) return sum;
              return sum + (end - start);
            }, 0);
          
          const lhsPercentage = Math.min(100, (lhsProgress / roadLength) * 100);
          const rhsPercentage = Math.min(100, (rhsProgress / roadLength) * 100);
          const layerProgress = (lhsPercentage + rhsPercentage) / 2;
          
          totalProgress += layerProgress;
        } else {
          // For single carriageway, sum all progress
          const completedLength = layer.progress.reduce((sum: number, prog: any) => {
            const start = parseFloat(prog.startChainage);
            const end = parseFloat(prog.endChainage);
            if (isNaN(start) || isNaN(end) || end <= start) return sum;
            return sum + (end - start);
          }, 0);
          const layerProgress = Math.min(100, (completedLength / roadLength) * 100);
          totalProgress += layerProgress;
        }
      }
    });

    return road.layers.length > 0 ? Math.round(totalProgress / road.layers.length) : 0;
  };

  const physicalProgress = calculatePhysicalProgress();
  const financialProgress = calculateFinancialProgress();
  const timeLapse = calculateTimeLapse();

  return (
    <>
      <div className="space-y-6">
        {/* Header with Status and Edit Button */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-3" data-testid="text-project-name">
              {project.name}
            </h2>
            <Badge className={`${getStatusColor(project.status)} text-white text-sm px-3 py-1`} data-testid="badge-project-status">
              {project.status}
            </Badge>
          </div>
          <Button onClick={() => setIsEditModalOpen(true)} data-testid="button-edit-project">
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>

        {/* Top Metric Cards - 6 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Project Number */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Project ID</p>
                  <p className="text-lg font-bold" data-testid="text-project-number">
                    {project.projectNumber || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Location</p>
                  <p className="text-lg font-bold" data-testid="text-project-location">
                    {project.location}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Value */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Contract Value</p>
                  <p className="text-lg font-bold" data-testid="text-contract-amount">
                    {formatCurrency(project.contractAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Start Date */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Start Date</p>
                  <p className="text-lg font-bold" data-testid="text-project-start-date">
                    {formatDate(project.startDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* End Date */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">End Date</p>
                  <p className="text-lg font-bold" data-testid="text-project-end-date">
                    {formatDate(project.endDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Type */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Project Type</p>
                  <p className="text-lg font-bold" data-testid="text-project-type">
                    {project.projectType || "Road"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Project Status & Progress
            </CardTitle>
            <CardDescription>Overall project performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Physical Progress */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Physical Progress</span>
                <span className="text-sm font-bold text-blue-600" data-testid="text-physical-progress">
                  {physicalProgress}%
                </span>
              </div>
              <Progress value={physicalProgress} className="h-3 bg-gray-200" 
                style={{"--progress-background": "hsl(217, 91%, 60%)"} as any}
                data-testid="progress-physical"
              />
            </div>

            {/* Financial Progress */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Financial Progress</span>
                <span className="text-sm font-bold text-green-600" data-testid="text-financial-progress">
                  {financialProgress}%
                </span>
              </div>
              <Progress value={financialProgress} className="h-3 bg-gray-200" 
                style={{"--progress-background": "hsl(142, 71%, 45%)"} as any}
                data-testid="progress-financial"
              />
            </div>

            {/* Time Lapse */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Time Lapse</span>
                <span className={`text-sm font-bold ${timeLapse > 100 ? 'text-red-600' : 'text-orange-600'}`} data-testid="text-time-lapse">
                  {timeLapse}%
                </span>
              </div>
              <Progress value={Math.min(timeLapse, 100)} className="h-3 bg-gray-200" 
                style={{"--progress-background": timeLapse > 100 ? "hsl(0, 84%, 60%)" : "hsl(25, 95%, 53%)"} as any}
                data-testid="progress-time-lapse"
              />
            </div>
          </CardContent>
        </Card>

        {/* Client and Contractor Information - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Name</p>
                <p className="text-sm font-semibold" data-testid="text-client-name">
                  {project.client || "N/A"}
                </p>
              </div>
              {project.clientContactPerson && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Contact</p>
                  <p className="text-sm font-semibold" data-testid="text-client-contact">
                    {project.clientContactPerson}
                  </p>
                </div>
              )}
              {project.clientEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm" data-testid="text-client-email">
                    {project.clientEmail}
                  </p>
                </div>
              )}
              {project.clientPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm" data-testid="text-client-phone">
                    {project.clientPhone}
                  </p>
                </div>
              )}
              {project.clientAddress && (
                <div className="flex items-start gap-2">
                  <MapPinned className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm" data-testid="text-client-address">
                    {project.clientAddress}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contractor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Contractor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Name</p>
                <p className="text-sm font-semibold" data-testid="text-contractor-name">
                  {project.contractorName || "N/A"}
                </p>
              </div>
              {project.contractorContactPerson && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Contact</p>
                  <p className="text-sm font-semibold" data-testid="text-contractor-contact">
                    {project.contractorContactPerson}
                  </p>
                </div>
              )}
              {project.contractorEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm" data-testid="text-contractor-email">
                    {project.contractorEmail}
                  </p>
                </div>
              )}
              {project.contractorPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm" data-testid="text-contractor-phone">
                    {project.contractorPhone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Condensed Road Progress Tracker - Only for Road Projects */}
        {project.projectType === "Road" && project.roads && project.roads.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Road Construction Progress</CardTitle>
                  <CardDescription>Quick overview of all roads</CardDescription>
                </div>
                <Link href={`/projects/${project.id}`}>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" data-testid="button-view-full-progress">
                    View Full Tracker
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.roads.slice(0, 5).map((road) => {
                  const roadProgress = calculateRoadProgress(road);
                  return (
                    <div key={road.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold" data-testid={`text-road-name-${road.id}`}>
                            {road.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {road.length} km • {road.roadType}
                          </p>
                        </div>
                        <span className="text-sm font-bold" data-testid={`text-road-progress-${road.id}`}>
                          {roadProgress}%
                        </span>
                      </div>
                      <Progress 
                        value={roadProgress} 
                        className="h-2" 
                        data-testid={`progress-road-${road.id}`}
                      />
                    </div>
                  );
                })}
                {project.roads.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    + {project.roads.length - 5} more roads
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {project.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-project-description">
                {project.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ProjectModal
          project={project}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
          }}
        />
      )}
    </>
  );
}
