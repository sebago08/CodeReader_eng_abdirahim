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
  Layers,
  Route,
  ListTodo,
} from "lucide-react";
import SegmentedProgress from "@/components/segmented-progress";
import ProjectModal from "@/components/project-modal";
import { queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads, ProjectAlerts, IncidentReport, Grievance } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import type { PaymentCertificate } from "@shared/schema";
import { Link } from "wouter";

interface OverviewTabProps {
  project: ProjectWithRoads;
}

type DetailModalType = 'milestones' | 'actionPoints' | 'incidents' | 'grievances' | 'roadProgress' | 'physicalProgress' | null;

interface ActionPointAlert {
  id: string;
  description: string;
  assignee?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  daysOverdue: number;
  createdAt?: string;
}

export default function OverviewTab({ project }: OverviewTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [selectedActionPoint, setSelectedActionPoint] = useState<ActionPointAlert | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<any | null>(null);

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

  // Fetch work plan activities for BOQ summary (non-Road projects)
  const { data: workPlanActivities = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${project.id}/activities`],
    enabled: !!project.id && project.projectType !== 'Road',
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
        {/* Top Row: Location and Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-950/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-400" />
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
                <div className="h-10 w-10 rounded-lg bg-orange-950/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-400" />
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
                <div className="h-10 w-10 rounded-lg bg-red-950/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-red-400" />
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
        </div>

        {/* Financial Summary */}
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
                {/* Physical Progress - Clickable for details */}
                <div 
                  className="cursor-pointer p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  onClick={() => setDetailModal('physicalProgress')}
                  data-testid="clickable-physical-progress"
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">Physical Progress</span>
                    <span className="text-sm font-semibold">{physicalProgress}%</span>
                  </div>
                  <Progress value={physicalProgress} className="h-2" data-testid="progress-physical" />
                  <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Click for details</p>
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
                      className="text-muted"
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
                      className="text-blue-400 transition-all duration-300"
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
                    <div className="text-sm text-red-400 font-medium">
                      {alerts.milestones.overdue.length} overdue
                    </div>
                  )}
                  {alerts.milestones.upcoming.length > 0 && (
                    <div className="text-sm text-orange-400 font-medium">
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
                <div className="text-sm text-red-400 font-medium">
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
                      <span className="text-red-400">Severe: {severeCount}</span>
                    )}
                    {seriousCount > 0 && (
                      <span className="text-orange-400">Serious: {seriousCount}</span>
                    )}
                    {indicativeCount > 0 && (
                      <span className="text-yellow-400">Indicative: {indicativeCount}</span>
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
                      <span className="text-blue-400">Registered: {registeredCount}</span>
                    )}
                    {investigatingCount > 0 && (
                      <span className="text-orange-400">Investigating: {investigatingCount}</span>
                    )}
                    {escalatedCount > 0 && (
                      <span className="text-red-400">Escalated: {escalatedCount}</span>
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
                  <h4 className="font-semibold text-sm text-red-400 mb-2">Overdue</h4>
                  <div className="space-y-2">
                    {alerts.milestones.overdue.map((m: any) => (
                      <div key={m.id} className="p-3 border rounded-lg bg-red-950/20">
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
                  <h4 className="font-semibold text-sm text-orange-400 mb-2">Upcoming (Next 7 Days)</h4>
                  <div className="space-y-2">
                    {alerts.milestones.upcoming.map((m: any) => (
                      <div key={m.id} className="p-3 border rounded-lg bg-orange-950/20">
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
      <Dialog 
        open={detailModal === 'actionPoints'} 
        onOpenChange={(open) => {
          if (!open) {
            setDetailModal(null);
            setSelectedActionPoint(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {selectedActionPoint ? (
            <>
              {/* Action Point Detail View */}
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedActionPoint(null)}
                    className="h-8 px-2"
                    data-testid="back-to-action-points-list"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <DialogTitle className="flex items-center gap-2 mt-2">
                  <Target className="h-5 w-5" />
                  Action Point Details
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  {selectedActionPoint.priority && (
                    <Badge 
                      variant={selectedActionPoint.priority === 'high' ? 'destructive' : selectedActionPoint.priority === 'medium' ? 'secondary' : 'outline'}
                    >
                      {selectedActionPoint.priority} priority
                    </Badge>
                  )}
                  <Badge variant="destructive" className="bg-red-600">
                    {selectedActionPoint.daysOverdue} days overdue
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 pr-4">
                  {/* Description */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h4>
                    <p className="text-foreground">{selectedActionPoint.description}</p>
                  </div>

                  <Separator />

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedActionPoint.assignee && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <User className="h-3 w-3" /> Assigned To
                        </h4>
                        <p className="text-sm text-foreground">{selectedActionPoint.assignee}</p>
                      </div>
                    )}

                    {selectedActionPoint.dueDate && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Due Date
                        </h4>
                        <p className="text-sm text-foreground">
                          {new Date(selectedActionPoint.dueDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Status
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-red-400 border-red-400">
                          Overdue
                        </Badge>
                        <span className="text-sm text-red-400">{selectedActionPoint.daysOverdue} days past deadline</span>
                      </div>
                    </div>

                    {selectedActionPoint.createdAt && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</h4>
                        <p className="text-sm text-foreground">
                          {new Date(selectedActionPoint.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Action Points List View */}
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
                      <div 
                        key={ap.id} 
                        className="p-3 border rounded-lg bg-red-950/20 cursor-pointer hover:bg-red-950/40 transition-colors"
                        onClick={() => setSelectedActionPoint(ap)}
                        data-testid={`action-point-item-${ap.id}`}
                      >
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
                          <span className="text-xs text-red-400 font-medium">
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
            </>
          )}
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
                        ? 'bg-red-950/20 border-red-800'
                        : incident.classification === 'serious'
                        ? 'bg-orange-950/20 border-orange-800'
                        : 'bg-yellow-950/20 border-yellow-800'
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
                        <p className="text-sm text-muted-foreground bg-green-950/20 p-3 rounded-lg border border-green-800">
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
                        <div className="bg-orange-950/20 p-3 rounded-lg border border-orange-800">
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
                        <div className="bg-red-950/20 p-3 rounded-lg border border-red-800">
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
                            ? 'bg-red-950/20 border-red-800'
                            : grievance.priority === 'high'
                            ? 'bg-orange-950/20 border-orange-800'
                            : 'bg-muted'
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

      {/* Physical Progress Modal - Shows Road progress for Road projects, BOQ summary for others */}
      <Dialog 
        open={detailModal === 'physicalProgress' || detailModal === 'roadProgress'} 
        onOpenChange={(open) => {
          if (!open) {
            setDetailModal(null);
            setSelectedRoad(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {project.projectType === "Road" && project.roads && project.roads.length > 0 ? (
            selectedRoad ? (
            <>
              {/* Road Detail View - Layer Progress */}
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedRoad(null)}
                    className="h-8 px-2"
                    data-testid="back-to-roads-list"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <DialogTitle className="flex items-center gap-2 mt-2">
                  <Route className="h-5 w-5" />
                  {selectedRoad.name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{selectedRoad.length}km</Badge>
                  <Badge variant="outline" className="capitalize">{selectedRoad.carriageway} carriageway</Badge>
                  <Badge 
                    variant="outline" 
                    className={`${calculateRoadProgress(selectedRoad) >= 100 ? 'text-green-400 border-green-400' : calculateRoadProgress(selectedRoad) >= 50 ? 'text-yellow-400 border-yellow-400' : 'text-blue-400 border-blue-400'}`}
                  >
                    {calculateRoadProgress(selectedRoad)}% complete
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {selectedRoad.layers && selectedRoad.layers.length > 0 ? (
                    selectedRoad.layers.map((layer: any) => {
                      const roadLength = parseFloat(selectedRoad.length);
                      const isDualCarriageway = selectedRoad.carriageway === 'dual';
                      
                      if (isDualCarriageway) {
                        const lhsProgress = layer.progress?.filter((p: any) => p.carriagewaySide?.toLowerCase() === 'lhs').reduce((sum: number, prog: any) => {
                          return sum + (Number(prog.endChainage) - Number(prog.startChainage));
                        }, 0) || 0;
                        const rhsProgress = layer.progress?.filter((p: any) => p.carriagewaySide?.toLowerCase() === 'rhs').reduce((sum: number, prog: any) => {
                          return sum + (Number(prog.endChainage) - Number(prog.startChainage));
                        }, 0) || 0;
                        
                        const lhsPercentage = Math.round((lhsProgress / roadLength) * 100);
                        const rhsPercentage = Math.round((rhsProgress / roadLength) * 100);
                        const averagePercentage = Math.round((lhsPercentage + rhsPercentage) / 2);
                        
                        return (
                          <div key={layer.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{layer.name}</span>
                                <span className={`text-sm font-semibold ${
                                  averagePercentage >= 100 ? 'text-green-400' : 
                                  averagePercentage >= 50 ? 'text-yellow-400' : 'text-muted-foreground'
                                }`}>
                                  ({averagePercentage}%)
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-card p-3 rounded border-l-2 border-blue-500">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-xs text-muted-foreground font-medium">LHS</div>
                                  <span className={`font-medium text-xs ${
                                    lhsPercentage >= 100 ? 'text-green-400' : 
                                    lhsPercentage >= 50 ? 'text-yellow-400' : 'text-muted-foreground'
                                  }`}>
                                    {lhsPercentage}%
                                  </span>
                                </div>
                                <SegmentedProgress 
                                  progress={layer.progress || []}
                                  roadLength={roadLength}
                                  carriagewaySide="lhs"
                                  layerId={layer.id}
                                />
                              </div>
                              <div className="bg-card p-3 rounded border-l-2 border-orange-500">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-xs text-muted-foreground font-medium">RHS</div>
                                  <span className={`font-medium text-xs ${
                                    rhsPercentage >= 100 ? 'text-green-400' : 
                                    rhsPercentage >= 50 ? 'text-yellow-400' : 'text-muted-foreground'
                                  }`}>
                                    {rhsPercentage}%
                                  </span>
                                </div>
                                <SegmentedProgress 
                                  progress={layer.progress || []}
                                  roadLength={roadLength}
                                  carriagewaySide="rhs"
                                  layerId={layer.id}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const completedLength = layer.progress?.reduce((sum: number, prog: any) => {
                          return sum + (Number(prog.endChainage) - Number(prog.startChainage));
                        }, 0) || 0;
                        const layerProgress = Math.round((completedLength / roadLength) * 100);
                        
                        return (
                          <div key={layer.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{layer.name}</span>
                                <span className={`text-sm font-semibold ${
                                  layerProgress >= 100 ? 'text-green-400' : 
                                  layerProgress >= 50 ? 'text-yellow-400' : 'text-muted-foreground'
                                }`}>
                                  ({layerProgress}%)
                                </span>
                              </div>
                            </div>
                            <div className="bg-card p-3 rounded">
                              <SegmentedProgress 
                                progress={layer.progress || []}
                                roadLength={roadLength}
                                carriagewaySide="both"
                                layerId={layer.id}
                              />
                            </div>
                          </div>
                        );
                      }
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No layers defined for this road</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              {/* Roads List View */}
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Road Construction Progress
                </DialogTitle>
                <DialogDescription>Click on a road to view layer-by-layer progress</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-3 pr-4">
                  {project.roads && project.roads.length > 0 ? (
                    project.roads.map((road) => {
                      const progress = calculateRoadProgress(road);
                      return (
                        <div 
                          key={road.id} 
                          onClick={() => setSelectedRoad(road)}
                          className="p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-primary/50 bg-muted/50"
                          data-testid={`road-item-${road.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Route className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <p className="font-medium text-sm truncate">{road.name}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span>{road.length}km</span>
                                <span className="capitalize">{road.carriageway} carriageway</span>
                                <span>{road.layers?.length || 0} layers</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <div className={`text-lg font-bold ${
                                  progress >= 100 ? 'text-green-400' : 
                                  progress >= 50 ? 'text-yellow-400' : 'text-foreground'
                                }`}>
                                  {progress}%
                                </div>
                                <div className="text-xs text-muted-foreground">complete</div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="mt-3">
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No roads defined for this project</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )) : (
            <>
              {/* BOQ Activities Summary for non-Road projects */}
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Physical Progress Details
                </DialogTitle>
                <DialogDescription>
                  BOQ activities progress summary - view Progress tab for full details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Overall Progress Summary */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Physical Progress</p>
                    <p className="text-3xl font-bold">{physicalProgress}%</p>
                  </div>
                  <div className="w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - physicalProgress / 100)}`}
                        className="text-primary transition-all duration-300"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Top Activities Preview */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    Recent Activities Progress
                  </h4>
                  {workPlanActivities.length > 0 ? (
                    <ScrollArea className="max-h-[250px]">
                      <div className="space-y-2 pr-4">
                        {workPlanActivities.slice(0, 8).map((activity: any, index: number) => {
                          const progress = activity.progress || 0;
                          return (
                            <div key={activity.id || index} className="p-3 border rounded-lg bg-muted/30">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium line-clamp-1 flex-1">{activity.name || activity.description}</span>
                                <span className={`text-sm font-semibold ml-2 ${
                                  progress >= 100 ? 'text-green-400' : 
                                  progress >= 50 ? 'text-yellow-400' : 'text-muted-foreground'
                                }`}>
                                  {progress}%
                                </span>
                              </div>
                              <Progress value={progress} className="h-1.5" />
                            </div>
                          );
                        })}
                        {workPlanActivities.length > 8 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            +{workPlanActivities.length - 8} more activities
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No work plan activities defined</p>
                      <p className="text-xs mt-1">Create a work plan to track progress</p>
                    </div>
                  )}
                </div>

                {/* Link to Progress Tab */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    For detailed BOQ tracking and quantities, visit the <span className="font-medium text-primary">Progress</span> tab
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
