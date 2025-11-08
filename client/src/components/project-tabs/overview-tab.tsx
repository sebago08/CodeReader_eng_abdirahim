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
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings,
} from "lucide-react";
import ProjectModal from "@/components/project-modal";
import { queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads, ProjectAlerts } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import type { PaymentCertificate } from "@shared/schema";
import { Link } from "wouter";
import DashboardGrid from "@/components/DashboardGrid";
import CustomizeDashboardModal from "@/components/CustomizeDashboardModal";
import type { DashboardLayout } from "@/lib/widgetRegistry";

interface OverviewTabProps {
  project: ProjectWithRoads;
}

export default function OverviewTab({ project }: OverviewTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  // Fetch payment certificates for financial progress
  const { data: certificates = [] } = useQuery<PaymentCertificate[]>({
    queryKey: [`/api/projects/${project.id}/payment-certificates`],
    enabled: !!project.id,
  });

  // Fetch project alerts
  const { data: alerts } = useQuery<ProjectAlerts>({
    queryKey: [`/api/projects/${project.id}/alerts`],
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

  // Calculate Physical Progress with road-length weighting
  const calculatePhysicalProgress = (): number => {
    if (project.projectType === "Road" && project.roads && project.roads.length > 0) {
      // First, calculate total project length
      const totalProjectLength = project.roads.reduce((sum, road) => {
        const roadLength = parseFloat(road.length);
        return !roadLength || roadLength <= 0 || isNaN(roadLength) ? sum : sum + roadLength;
      }, 0);
      
      if (totalProjectLength === 0) return 0;
      
      let weightedProgress = 0;

      project.roads.forEach((road) => {
        // Validate road length
        const roadLength = parseFloat(road.length);
        if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
          return; // Skip roads with invalid lengths
        }

        const roadWeight = roadLength / totalProjectLength; // Road's contribution to overall progress
        const isDualCarriageway = road.carriageway === 'dual';
        let roadProgress = 0;
        let totalLayerWeight = 0;

        road.layers?.forEach((layer) => {
          const layerWeight = layer.weight || 1;
          totalLayerWeight += layerWeight;
          
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
              
              roadProgress += layerProgress * layerWeight;
            } else {
              // For single carriageway, sum all progress
              const completedLength = layer.progress.reduce((sum, prog) => {
                const start = parseFloat(prog.startChainage as any);
                const end = parseFloat(prog.endChainage as any);
                if (isNaN(start) || isNaN(end) || end <= start) return sum;
                return sum + (end - start);
              }, 0);
              const layerProgress = Math.min(100, (completedLength / roadLength) * 100);
              roadProgress += layerProgress * layerWeight;
            }
          }
        });
        
        // Calculate this road's weighted progress and add to overall
        const thisRoadProgress = totalLayerWeight > 0 ? roadProgress / totalLayerWeight : 0;
        weightedProgress += thisRoadProgress * roadWeight;
      });

      return Math.min(100, Math.round(weightedProgress));
    }
    
    // For non-road projects, would use activities (not implemented in this view)
    return 0;
  };

  // Calculate Financial Progress
  const calculateFinancialProgress = (): number => {
    const contractAmount = project.contractAmount ? parseFloat(project.contractAmount) : 0;
    if (contractAmount === 0) return 0;

    // Only count amount paid for financial progress
    const totalPaid = certificates.reduce((sum, cert) => {
      return sum + parseFloat(cert.amountPaid || "0");
    }, 0);

    return Math.round((totalPaid / contractAmount) * 100);
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

  // Calculate actual amount paid from certificates
  const totalPaid = certificates.reduce((sum, cert) => {
    return sum + parseFloat(cert.amountPaid || "0");
  }, 0);

  // Calculate balance
  const contractAmount = parseFloat(project.contractAmount || "0");
  const balance = Math.max(0, contractAmount - totalPaid);

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCustomizeModalOpen(true)} data-testid="button-customize-dashboard">
              <Settings className="h-4 w-4 mr-2" />
              Customize Dashboard
            </Button>
            <Button onClick={() => setIsEditModalOpen(true)} data-testid="button-edit-project">
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </div>
        </div>


        {/* Customizable Dashboard Grid */}
        <DashboardGrid 
          project={project} 
          layout={project.dashboardLayout as DashboardLayout | null} 
        />

              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-project-description">
                {project.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Client and Contractor Information - Collapsible */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowClientInfo(!showClientInfo)} data-testid="button-toggle-client-info">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Client & Contractor Information
              </CardTitle>
              {showClientInfo ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
          {showClientInfo && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client Details
                  </h3>
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
                </div>

                {/* Contractor Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Contractor Details
                  </h3>
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
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Customize Dashboard Modal */}
      <CustomizeDashboardModal
        open={isCustomizeModalOpen}
        onOpenChange={setIsCustomizeModalOpen}
        projectId={project.id}
        currentLayout={project.dashboardLayout as DashboardLayout | null}
      />

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
