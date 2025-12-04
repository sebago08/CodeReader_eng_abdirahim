import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  MessageSquare,
  ArrowLeft,
  UserCircle,
  Target,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ProjectModal from "@/components/project-modal";
import { queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads, ProjectAlerts, IncidentReport, Grievance } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import type { PaymentCertificate } from "@shared/schema";
import { Link } from "wouter";

interface OverviewTabProps {
  project: ProjectWithRoads;
}

type DetailModalType = 'milestones' | 'actionPoints' | 'incidents' | 'grievances' | null;

export default function OverviewTab({ project }: OverviewTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);

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

  // Fetch incident reports for project
  const { data: incidentReports = [] } = useQuery<IncidentReport[]>({
    queryKey: ['/api/projects', project.id, 'incident-reports'],
    enabled: !!project.id,
  });

  // Calculate open incident counts
  const openIncidents = incidentReports.filter(i => i.status !== 'closed');
  const severeCount = openIncidents.filter(i => i.classification === 'severe').length;
  const seriousCount = openIncidents.filter(i => i.classification === 'serious').length;
  const indicativeCount = openIncidents.filter(i => i.classification === 'indicative').length;

  // Fetch grievances for project
  const { data: grievances = [] } = useQuery<Grievance[]>({
    queryKey: ['/api/projects', project.id, 'grievances'],
    enabled: !!project.id,
  });

  // Calculate open grievance counts
  const openGrievances = grievances.filter(g => g.status !== 'closed');
  const registeredCount = openGrievances.filter(g => g.status === 'registered').length;
  const investigatingCount = openGrievances.filter(g => g.status === 'under_investigation').length;
  const escalatedCount = openGrievances.filter(g => g.status === 'escalated').length;

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

  // Calculate time progress
  const calculateTimeProgress = (): number => {
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = new Date().getTime();
    
    if (end <= start) return 0;
    
    const elapsed = now - start;
    const total = end - start;
    const progress = (elapsed / total) * 100;
    
    return Math.min(100, Math.max(0, Math.round(progress)));
  };

  const timeProgress = calculateTimeProgress();

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


        {/* Fixed Dashboard Layout */}
        {/* Top Row: Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Project ID</p>
                  <p className="text-lg font-semibold" data-testid="text-project-id">
                    {project.projectNumber || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-lg font-semibold" data-testid="text-project-location">
                    {project.location}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Project Type</p>
                  <p className="text-lg font-semibold" data-testid="text-project-type">
                    {project.projectType}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row: Dates and Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-lg font-semibold" data-testid="text-start-date">
                    {formatDate(project.startDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-lg font-semibold" data-testid="text-end-date">
                    {formatDate(project.endDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-lg font-semibold" data-testid="text-balance">
                    {formatCurrency(balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Row: Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Contract Amount</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-contract-amount">
                  {formatCurrency(contractAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total project value</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Amount Spent</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-amount-spent">
                  {formatCurrency(totalPaid)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">From payment certificates</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Balance</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-balance-remaining">
                  {formatCurrency(balance)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Remaining funds</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Overview
            </CardTitle>
            <CardDescription>Track project completion and timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Left side: Progress bars */}
              <div className="space-y-4 max-w-md flex-1">
                {/* Physical Progress */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Physical Progress</span>
                    <span className="text-sm font-semibold">{physicalProgress}%</span>
                  </div>
                  <Progress value={physicalProgress} className="h-2" data-testid="progress-physical" />
                </div>

                {/* Time Progress */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Time Progress</span>
                    <span className="text-sm font-semibold">{timeProgress}%</span>
                  </div>
                  <Progress value={timeProgress} className="h-2" data-testid="progress-time" />
                </div>
              </div>

              {/* Right side: Financial Progress Chart */}
              <div className="flex items-center justify-center flex-shrink-0">
                <div className="relative">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 48}`}
                      strokeDashoffset={`${2 * Math.PI * 48 * (1 - financialProgress / 100)}`}
                      className="text-blue-600 dark:text-blue-400 transition-all duration-300"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-bold">{financialProgress}%</div>
                      <div className="text-xs text-muted-foreground">Financial</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Milestones */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => setDetailModal('milestones')}
            data-testid="card-milestones"
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Milestones
              </CardTitle>
              <CardDescription>Upcoming and overdue</CardDescription>
            </CardHeader>
            <CardContent>
              {!alerts || (alerts.milestones.upcoming.length === 0 && alerts.milestones.overdue.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">No milestones set</p>
              ) : (
                <div className="space-y-2">
                  {alerts.milestones.overdue.length > 0 && (
                    <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {alerts.milestones.overdue.length} overdue
                    </div>
                  )}
                  {alerts.milestones.upcoming.length > 0 && (
                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                      {alerts.milestones.upcoming.length} upcoming
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overdue Action Points */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => setDetailModal('actionPoints')}
            data-testid="card-action-points"
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue Action Points
              </CardTitle>
              <CardDescription>Missed deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              {!alerts || alerts.actionPoints.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No overdue action points</p>
              ) : (
                <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {alerts.actionPoints.length} overdue {alerts.actionPoints.length === 1 ? 'item' : 'items'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Incidents */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => setDetailModal('incidents')}
            data-testid="card-incidents"
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Open Incidents
              </CardTitle>
              <CardDescription>World Bank ESF compliance</CardDescription>
            </CardHeader>
            <CardContent>
              {openIncidents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No open incidents</p>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{openIncidents.length}</div>
                  <div className="flex gap-3 text-xs">
                    {severeCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">Severe: {severeCount}</span>
                    )}
                    {seriousCount > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">Serious: {seriousCount}</span>
                    )}
                    {indicativeCount > 0 && (
                      <span className="text-yellow-600 dark:text-yellow-400">Indicative: {indicativeCount}</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Grievances */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => setDetailModal('grievances')}
            data-testid="card-grievances"
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Open Grievances
              </CardTitle>
              <CardDescription>Community complaints (GRM)</CardDescription>
            </CardHeader>
            <CardContent>
              {openGrievances.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No open grievances</p>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{openGrievances.length}</div>
                  <div className="flex gap-3 text-xs">
                    {registeredCount > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">Registered: {registeredCount}</span>
                    )}
                    {investigatingCount > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">Investigating: {investigatingCount}</span>
                    )}
                    {escalatedCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">Escalated: {escalatedCount}</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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

      {/* Milestones Detail Modal */}
      <Dialog open={detailModal === 'milestones'} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Milestones
            </DialogTitle>
            <DialogDescription>Upcoming and overdue milestones for this project</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4 pr-4">
              {alerts?.milestones.overdue && alerts.milestones.overdue.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-red-600 dark:text-red-400 mb-2">Overdue</h4>
                  <div className="space-y-2">
                    {alerts.milestones.overdue.map((m: any) => (
                      <div key={m.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                        <p className="font-medium text-sm">{m.activityName}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">Due: {formatDate(m.dueDate)}</span>
                          <Badge variant="destructive" className="text-xs">{m.daysOverdue} days overdue</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {alerts?.milestones.upcoming && alerts.milestones.upcoming.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-orange-600 dark:text-orange-400 mb-2">Upcoming (Next 7 Days)</h4>
                  <div className="space-y-2">
                    {alerts.milestones.upcoming.map((m: any) => (
                      <div key={m.id} className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                        <p className="font-medium text-sm">{m.activityName}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">Due: {formatDate(m.dueDate)}</span>
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                            {m.daysUntil === 0 ? 'Due today' : `${m.daysUntil} days left`}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!alerts || (alerts.milestones.upcoming.length === 0 && alerts.milestones.overdue.length === 0)) && (
                <p className="text-sm text-muted-foreground text-center py-8">No milestones to display</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Action Points Detail Modal */}
      <Dialog open={detailModal === 'actionPoints'} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Overdue Action Points
            </DialogTitle>
            <DialogDescription>Action items that have passed their deadline</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-4">
              {alerts?.actionPoints && alerts.actionPoints.length > 0 ? (
                alerts.actionPoints.map((ap: any) => (
                  <div key={ap.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <p className="font-medium text-sm">{ap.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {ap.assignee && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> {ap.assignee}
                          </span>
                        )}
                        {ap.priority && (
                          <Badge 
                            variant={ap.priority === 'high' ? 'destructive' : ap.priority === 'medium' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {ap.priority}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        {ap.daysOverdue} days overdue
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No overdue action points</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Incidents Detail Modal */}
      <Dialog open={detailModal === 'incidents'} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Open Incidents
            </DialogTitle>
            <DialogDescription>World Bank ESF compliance incident reports</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-4">
              {openIncidents.length > 0 ? (
                openIncidents.map((incident) => (
                  <div 
                    key={incident.id} 
                    className={`p-3 border rounded-lg ${
                      incident.classification === 'severe' 
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                        : incident.classification === 'serious'
                        ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                        : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{incident.incidentTitle}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{incident.incidentDescription}</p>
                      </div>
                      <Badge 
                        variant={incident.classification === 'severe' ? 'destructive' : 'secondary'}
                        className={`text-xs ml-2 ${
                          incident.classification === 'serious' ? 'bg-orange-500 hover:bg-orange-600' : ''
                        }`}
                      >
                        {incident.classification}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {incident.incidentDateTime ? formatDate(new Date(incident.incidentDateTime).toISOString()) : 'Date not set'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {incident.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No open incidents</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Grievances Detail Modal */}
      <Dialog 
        open={detailModal === 'grievances'} 
        onOpenChange={(open) => {
          if (!open) {
            setDetailModal(null);
            setSelectedGrievance(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {selectedGrievance ? (
            <>
              {/* Grievance Detail View */}
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedGrievance(null)}
                    className="h-8 px-2"
                    data-testid="back-to-grievances-list"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <DialogTitle className="flex items-center gap-2 mt-2">
                  <MessageSquare className="h-5 w-5" />
                  {selectedGrievance.grievanceNumber}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">
                    {selectedGrievance.category?.replace(/_/g, ' ')}
                  </Badge>
                  <Badge 
                    variant={selectedGrievance.priority === 'urgent' ? 'destructive' : selectedGrievance.priority === 'high' ? 'secondary' : 'outline'}
                  >
                    {selectedGrievance.priority} priority
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`${
                      selectedGrievance.status === 'escalated' ? 'border-red-300 text-red-600' :
                      selectedGrievance.status === 'under_investigation' ? 'border-orange-300 text-orange-600' :
                      selectedGrievance.status === 'resolved' ? 'border-green-300 text-green-600' :
                      'border-blue-300 text-blue-600'
                    }`}
                  >
                    {selectedGrievance.status?.replace(/_/g, ' ')}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-4 pr-4">
                  {/* Description Section */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedGrievance.description || 'No description provided'}
                    </p>
                  </div>

                  <Separator />

                  {/* Complainant Information */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      Complainant Information
                    </h4>
                    {selectedGrievance.isAnonymous ? (
                      <p className="text-sm text-muted-foreground italic">Anonymous complaint</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <p className="font-medium">{selectedGrievance.complainantName || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gender:</span>
                          <p className="font-medium capitalize">{selectedGrievance.gender || 'Not specified'}</p>
                        </div>
                        {selectedGrievance.contactPhone && (
                          <div>
                            <span className="text-muted-foreground">Phone:</span>
                            <p className="font-medium">{selectedGrievance.contactPhone}</p>
                          </div>
                        )}
                        {selectedGrievance.contactEmail && (
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <p className="font-medium">{selectedGrievance.contactEmail}</p>
                          </div>
                        )}
                        {selectedGrievance.contactAddress && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Address:</span>
                            <p className="font-medium">{selectedGrievance.contactAddress}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Intake Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Intake Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Date Received:</span>
                        <p className="font-medium">
                          {selectedGrievance.dateReceived 
                            ? formatDate(new Date(selectedGrievance.dateReceived).toISOString()) 
                            : 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Source:</span>
                        <p className="font-medium capitalize">{selectedGrievance.source?.replace(/_/g, ' ') || 'Not specified'}</p>
                      </div>
                      {selectedGrievance.location && (
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <p className="font-medium">{selectedGrievance.location}</p>
                        </div>
                      )}
                      {selectedGrievance.district && (
                        <div>
                          <span className="text-muted-foreground">District:</span>
                          <p className="font-medium">{selectedGrievance.district}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Assignment & Timeline */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      Assignment & Timeline
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assigned To:</span>
                        <p className="font-medium">{selectedGrievance.assignedTo || 'Unassigned'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Acknowledged:</span>
                        <p className="font-medium">
                          {selectedGrievance.acknowledgementDate 
                            ? formatDate(new Date(selectedGrievance.acknowledgementDate).toISOString()) 
                            : 'Pending'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target Resolution:</span>
                        <p className="font-medium">
                          {selectedGrievance.targetResolutionDate 
                            ? formatDate(new Date(selectedGrievance.targetResolutionDate).toISOString()) 
                            : 'Not set'}
                        </p>
                      </div>
                      {selectedGrievance.dateResolved && (
                        <div>
                          <span className="text-muted-foreground">Date Resolved:</span>
                          <p className="font-medium text-green-600">
                            {formatDate(new Date(selectedGrievance.dateResolved).toISOString())}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resolution Section (if resolved) */}
                  {selectedGrievance.resolutionDescription && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Resolution
                        </h4>
                        <p className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                          {selectedGrievance.resolutionDescription}
                        </p>
                        {selectedGrievance.satisfactionLevel && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Satisfaction:</span>
                            <Badge 
                              variant="outline" 
                              className={`capitalize ${
                                selectedGrievance.satisfactionLevel === 'satisfied' ? 'border-green-300 text-green-600' :
                                selectedGrievance.satisfactionLevel === 'partially_satisfied' ? 'border-yellow-300 text-yellow-600' :
                                'border-red-300 text-red-600'
                              }`}
                            >
                              {selectedGrievance.satisfactionLevel.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        )}
                        {selectedGrievance.feedbackComments && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Feedback:</span>
                            <p className="mt-1">{selectedGrievance.feedbackComments}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Escalation Section (if escalated) */}
                  {selectedGrievance.isEscalated && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          Escalation Details
                        </h4>
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                          {selectedGrievance.escalatedTo && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Escalated To:</span>{' '}
                              <span className="font-medium">{selectedGrievance.escalatedTo}</span>
                            </p>
                          )}
                          {selectedGrievance.escalationDate && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Escalation Date:</span>{' '}
                              <span className="font-medium">{formatDate(new Date(selectedGrievance.escalationDate).toISOString())}</span>
                            </p>
                          )}
                          {selectedGrievance.escalationReason && (
                            <p className="text-sm mt-2">
                              <span className="text-muted-foreground">Reason:</span>{' '}
                              {selectedGrievance.escalationReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Appeal Section (if appealed) */}
                  {selectedGrievance.isAppealed && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          Appeal Details
                        </h4>
                        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                          {selectedGrievance.appealDate && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Appeal Date:</span>{' '}
                              <span className="font-medium">{formatDate(new Date(selectedGrievance.appealDate).toISOString())}</span>
                            </p>
                          )}
                          {selectedGrievance.appealOutcome && (
                            <p className="text-sm mt-2">
                              <span className="text-muted-foreground">Outcome:</span>{' '}
                              {selectedGrievance.appealOutcome}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Internal Notes (if any) */}
                  {selectedGrievance.internalNotes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Internal Notes
                        </h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg italic">
                          {selectedGrievance.internalNotes}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Grievances List View */}
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Open Grievances
                </DialogTitle>
                <DialogDescription>Click on a grievance to view full details</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2 pr-4">
                  {openGrievances.length > 0 ? (
                    openGrievances.map((grievance) => (
                      <div 
                        key={grievance.id} 
                        onClick={() => setSelectedGrievance(grievance)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                          grievance.priority === 'urgent' 
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                            : grievance.priority === 'high'
                            ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                            : 'bg-gray-50 dark:bg-gray-950/20'
                        }`}
                        data-testid={`grievance-item-${grievance.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{grievance.grievanceNumber}</p>
                              <Badge variant="outline" className="text-xs capitalize">
                                {grievance.category?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{grievance.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={grievance.priority === 'urgent' ? 'destructive' : grievance.priority === 'high' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {grievance.priority}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {grievance.isAnonymous ? 'Anonymous' : grievance.complainantName || 'Unknown'}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              grievance.status === 'escalated' ? 'border-red-300 text-red-600' :
                              grievance.status === 'under_investigation' ? 'border-orange-300 text-orange-600' :
                              'border-blue-300 text-blue-600'
                            }`}
                          >
                            {grievance.status?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No open grievances</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
