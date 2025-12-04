import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { DollarSign, Wallet, PiggyBank, AlertTriangle, TrendingUp, Calendar, LogOut, Plus, MoreVertical, Copy, Trash2, MessageSquare, Clock, FileWarning, ArrowLeft, MapPin, User, FileText } from "lucide-react";
import type { DashboardMetrics } from "@shared/schema";
import ProjectModal from "@/components/project-modal";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

type ModalType = 'delayed' | 'incidents' | 'grievances' | null;

type IncidentItem = DashboardMetrics['incidentsList'][number];
type GrievanceItem = DashboardMetrics['grievancesList'][number];

export default function Dashboard() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [selectedGrievance, setSelectedGrievance] = useState<GrievanceItem | null>(null);
  const { logoutMutation, user } = useAuth();
  const { toast } = useToast();

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const duplicateMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/duplicate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Project duplicated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate project",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleDuplicate = (projectId: string) => {
    duplicateMutation.mutate(projectId);
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadgeColor = (status: string) => {
    const statusColors: Record<string, string> = {
      "On Track": "bg-green-900/50 text-green-400 border-green-700",
      "Active": "bg-green-900/50 text-green-400 border-green-700",
      "At Risk": "bg-orange-900/50 text-orange-400 border-orange-700",
      "Behind": "bg-red-900/50 text-red-400 border-red-700",
      "Delayed": "bg-red-900/50 text-red-400 border-red-700",
      "Completed": "bg-blue-900/50 text-blue-400 border-blue-700",
    };
    return statusColors[status] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">
        <Sidebar />
      </div>
      
      <MobileNav />
      
      <div className="flex-1 md:ml-64">
        {/* Top Bar with User Info */}
        <header className="bg-black text-white shadow-lg">
          <div className="w-full px-4 md:px-8">
            <div className="flex justify-between items-center py-3 md:py-4 gap-2">
              <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
                <div className="h-8 w-8 md:h-10 md:w-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <i className="fas fa-hard-hat text-sm md:text-lg"></i>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-xl font-bold truncate">ConstructTrack</h1>
                  <p className="text-white/80 text-xs md:text-sm hidden sm:block">Professional Construction Management</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                {user && (
                  <div className="text-white hidden sm:block" data-testid="text-current-username">
                    <span className="text-xs md:text-sm text-white/60">Signed in as:</span>
                    <span className="ml-1 md:ml-2 font-medium text-sm md:text-base">{user.username}</span>
                  </div>
                )}
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 px-2 md:px-4"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Header */}
        <header className="bg-card border-b border-border px-4 md:px-8 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
                Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1" data-testid="text-dashboard-subtitle">
                Key financial and project metrics overview.
              </p>
            </div>
            <Button
              onClick={() => setShowProjectModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              data-testid="button-create-project"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              Create Project
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border">
                    <CardContent className="pt-6">
                      <div className="h-4 bg-muted rounded w-2/3 animate-pulse mb-4"></div>
                      <div className="h-10 bg-muted rounded w-1/3 animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border">
                    <CardContent className="pt-6">
                      <div className="h-4 bg-muted rounded w-2/3 animate-pulse mb-4"></div>
                      <div className="h-10 bg-muted rounded w-1/3 animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <Card className="border-border bg-card" data-testid="card-financial-total">
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 md:p-3 bg-green-900/30 rounded-lg shrink-0">
                        <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground">
                          Total Contracts
                        </p>
                        <p className="text-xl md:text-2xl font-bold text-green-400 truncate" data-testid="text-financial-total">
                          ${formatCurrency(metrics?.financialTotal || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Sum of all contract amounts
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card" data-testid="card-amount-spent">
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 md:p-3 bg-orange-900/30 rounded-lg shrink-0">
                        <Wallet className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground">
                          IPCs Paid
                        </p>
                        <p className="text-xl md:text-2xl font-bold text-orange-400 truncate" data-testid="text-amount-spent">
                          ${formatCurrency(metrics?.amountSpent || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Total payment certificates
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card sm:col-span-2 lg:col-span-1" data-testid="card-current-balance">
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 md:p-3 bg-blue-900/30 rounded-lg shrink-0">
                        <PiggyBank className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground">
                          Balance
                        </p>
                        <p className="text-xl md:text-2xl font-bold text-blue-400 truncate" data-testid="text-current-balance">
                          ${formatCurrency(metrics?.currentBalance || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Contracts - IPCs paid
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                <Card 
                  className="border-border bg-card cursor-pointer hover:border-orange-500/50 transition-colors" 
                  data-testid="card-projects-behind"
                  onClick={() => setActiveModal('delayed')}
                >
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 md:p-3 bg-orange-900/30 rounded-lg shrink-0">
                        <Clock className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                          Projects Behind
                        </p>
                        <p className="text-2xl md:text-3xl font-bold text-orange-400" data-testid="text-projects-behind">
                          {metrics?.projectsBehindSchedule || 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Click to view details
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="border-border bg-card cursor-pointer hover:border-purple-500/50 transition-colors" 
                  data-testid="card-incident-reports"
                  onClick={() => setActiveModal('incidents')}
                >
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 md:p-3 bg-purple-900/30 rounded-lg shrink-0">
                        <FileWarning className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                          Incidents
                        </p>
                        <p className="text-2xl md:text-3xl font-bold text-purple-400" data-testid="text-incident-reports-total">
                          {metrics?.openIncidentReports?.total || 0}
                        </p>
                        <div className="flex flex-col gap-0.5 text-xs mt-1">
                          <span className="text-red-400" data-testid="text-incidents-severe">
                            Severe: {metrics?.openIncidentReports?.severe || 0}
                          </span>
                          <span className="text-orange-400" data-testid="text-incidents-serious">
                            Serious: {metrics?.openIncidentReports?.serious || 0}
                          </span>
                          <span className="text-yellow-400" data-testid="text-incidents-indicative">
                            Indicative: {metrics?.openIncidentReports?.indicative || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="border-border bg-card cursor-pointer hover:border-cyan-500/50 transition-colors" 
                  data-testid="card-open-grievances"
                  onClick={() => setActiveModal('grievances')}
                >
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 md:p-3 bg-cyan-900/30 rounded-lg shrink-0">
                        <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                          Grievances
                        </p>
                        <p className="text-2xl md:text-3xl font-bold text-cyan-400" data-testid="text-grievances-total">
                          {metrics?.openGrievances?.total || 0}
                        </p>
                        <div className="flex flex-col gap-0.5 text-xs mt-1">
                          <span className="text-blue-400" data-testid="text-grievances-registered">
                            Registered: {metrics?.openGrievances?.registered || 0}
                          </span>
                          <span className="text-yellow-400" data-testid="text-grievances-investigating">
                            Investigating: {metrics?.openGrievances?.underInvestigation || 0}
                          </span>
                          <span className="text-red-400" data-testid="text-grievances-escalated">
                            Escalated: {metrics?.openGrievances?.escalated || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card" data-testid="card-upcoming-milestones">
                  <CardContent className="p-4 md:pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 md:p-3 bg-muted rounded-lg shrink-0">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                          Milestones (30d)
                        </p>
                        <p className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-upcoming-milestones">
                          {metrics?.upcomingMilestones || 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Upcoming deadlines
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold text-foreground mb-4" data-testid="text-active-projects-title">
                    Active Projects
                  </h2>
                  {!metrics?.activeProjects || metrics.activeProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No active projects found</p>
                      <Button 
                        onClick={() => setShowProjectModal(true)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="button-create-first-project"
                      >
                        Create Your First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead className="text-muted-foreground font-semibold">
                              Project Name
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold">
                              Financial
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold">
                              Time
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold">
                              Physical
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold">
                              Due Date
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold">
                              Grievances
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metrics.activeProjects.map((project) => (
                            <TableRow 
                              key={project.id} 
                              className="border-border hover:bg-muted"
                              data-testid={`row-project-${project.id}`}
                            >
                              <TableCell className="font-medium text-foreground">
                                <Link href={`/projects/${project.id}`}>
                                  <span className="hover:underline cursor-pointer text-blue-400" data-testid={`link-project-name-${project.id}`}>
                                    {project.name}
                                  </span>
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={`border ${getStatusBadgeColor(project.status)}`}
                                  data-testid={`badge-status-${project.id}`}
                                >
                                  {project.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <Progress 
                                    value={project.financialProgress} 
                                    className="flex-1 h-2 max-w-[80px]" 
                                  />
                                  <span className="text-sm font-medium text-muted-foreground min-w-[35px]">
                                    {project.financialProgress}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <Progress 
                                    value={project.timeProgress} 
                                    className="flex-1 h-2 max-w-[80px]" 
                                  />
                                  <span className="text-sm font-medium text-muted-foreground min-w-[35px]">
                                    {project.timeProgress}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <Progress 
                                    value={project.physicalProgress} 
                                    className="flex-1 h-2 max-w-[80px]" 
                                  />
                                  <span className="text-sm font-medium text-muted-foreground min-w-[35px]">
                                    {project.physicalProgress}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {project.dueDate ? format(new Date(project.dueDate), 'MMM dd, yyyy') : '-'}
                              </TableCell>
                              <TableCell>
                                {project.openGrievances && project.openGrievances > 0 ? (
                                  <Badge 
                                    className="bg-cyan-900 text-cyan-100 border-cyan-200"
                                    data-testid={`badge-grievances-${project.id}`}
                                  >
                                    {project.openGrievances}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm" data-testid={`text-grievances-${project.id}`}>0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      data-testid={`button-menu-${project.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      onClick={() => handleDuplicate(project.id)}
                                      data-testid={`menu-duplicate-${project.id}`}
                                    >
                                      <Copy className="mr-2 h-4 w-4" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteClick(project.id)}
                                      className="text-red-400"
                                      data-testid={`menu-delete-${project.id}`}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>

      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
          onSuccess={() => {
            setShowProjectModal(false);
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone and will permanently delete all associated data including roads, layers, work plans, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delayed Projects Modal */}
      <Dialog open={activeModal === 'delayed'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-400" />
              Projects Behind Schedule
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {(!metrics?.delayedProjects || metrics.delayedProjects.length === 0) ? (
              <p className="text-muted-foreground text-center py-4">No delayed projects</p>
            ) : (
              <div className="space-y-3">
                {metrics.delayedProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                      <p className="font-medium text-foreground mb-2">{project.name}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-400">
                          Time: {project.timeLapse}%
                        </span>
                        <span className="text-blue-400">
                          Progress: {project.boqProgress}%
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Incidents Modal */}
      <Dialog open={activeModal === 'incidents'} onOpenChange={(open) => {
        if (!open) {
          setActiveModal(null);
          setSelectedIncident(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIncident && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 mr-1"
                  onClick={() => setSelectedIncident(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <FileWarning className="h-5 w-5 text-purple-400" />
              {selectedIncident ? 'Incident Details' : 'Open Incidents'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {selectedIncident ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{selectedIncident.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedIncident.projectName}</p>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={
                      selectedIncident.classification === 'severe' ? 'text-red-400 border-red-400' :
                      selectedIncident.classification === 'serious' ? 'text-orange-400 border-orange-400' :
                      'text-yellow-400 border-yellow-400'
                    }
                  >
                    {selectedIncident.classification}
                  </Badge>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {selectedIncident.status}
                  </Badge>
                </div>
                
                <Separator />
                
                {selectedIncident.dateOccurred && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date Occurred</p>
                      <p className="text-sm text-foreground">
                        {format(new Date(selectedIncident.dateOccurred), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedIncident.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm text-foreground">{selectedIncident.location}</p>
                    </div>
                  </div>
                )}
                
                {selectedIncident.reportedBy && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Reported By</p>
                      <p className="text-sm text-foreground">{selectedIncident.reportedBy}</p>
                    </div>
                  </div>
                )}
                
                {selectedIncident.description && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedIncident.description}</p>
                    </div>
                  </div>
                )}
                
                {selectedIncident.immediateActions && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Immediate Actions</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedIncident.immediateActions}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {(!metrics?.incidentsList || metrics.incidentsList.length === 0) ? (
                  <p className="text-muted-foreground text-center py-4">No open incidents</p>
                ) : (
                  <div className="space-y-3">
                    {metrics.incidentsList.map((incident) => (
                      <div 
                        key={incident.id} 
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <p className="font-medium text-foreground">{incident.title}</p>
                        <p className="text-xs text-muted-foreground">{incident.projectName}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={
                              incident.classification === 'severe' ? 'text-red-400 border-red-400' :
                              incident.classification === 'serious' ? 'text-orange-400 border-orange-400' :
                              'text-yellow-400 border-yellow-400'
                            }
                          >
                            {incident.classification}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Grievances Modal */}
      <Dialog open={activeModal === 'grievances'} onOpenChange={(open) => {
        if (!open) {
          setActiveModal(null);
          setSelectedGrievance(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGrievance && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 mr-1"
                  onClick={() => setSelectedGrievance(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <MessageSquare className="h-5 w-5 text-cyan-400" />
              {selectedGrievance ? 'Grievance Details' : 'Open Grievances'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {selectedGrievance ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{selectedGrievance.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGrievance.projectName}</p>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                    {selectedGrievance.category}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={
                      selectedGrievance.priority === 'urgent' ? 'text-red-400 border-red-400' :
                      selectedGrievance.priority === 'high' ? 'text-orange-400 border-orange-400' :
                      'text-muted-foreground border-muted-foreground'
                    }
                  >
                    {selectedGrievance.priority}
                  </Badge>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {selectedGrievance.status}
                  </Badge>
                </div>
                
                <Separator />
                
                {selectedGrievance.dateReceived && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date Received</p>
                      <p className="text-sm text-foreground">
                        {format(new Date(selectedGrievance.dateReceived), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedGrievance.source && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="text-sm text-foreground capitalize">{selectedGrievance.source.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Complainant</p>
                    <p className="text-sm text-foreground">
                      {selectedGrievance.isAnonymous ? (
                        <span className="italic text-muted-foreground">Anonymous</span>
                      ) : (
                        selectedGrievance.complainantName || 'Not provided'
                      )}
                    </p>
                  </div>
                </div>
                
                {selectedGrievance.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm text-foreground">{selectedGrievance.location}</p>
                    </div>
                  </div>
                )}
                
                {selectedGrievance.description && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedGrievance.description}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {(!metrics?.grievancesList || metrics.grievancesList.length === 0) ? (
                  <p className="text-muted-foreground text-center py-4">No open grievances</p>
                ) : (
                  <div className="space-y-3">
                    {metrics.grievancesList.map((grievance) => (
                      <div 
                        key={grievance.id} 
                        className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => setSelectedGrievance(grievance)}
                      >
                        <p className="font-medium text-foreground">{grievance.title}</p>
                        <p className="text-xs text-muted-foreground">{grievance.projectName}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                            {grievance.category}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={
                              grievance.priority === 'urgent' ? 'text-red-400 border-red-400' :
                              grievance.priority === 'high' ? 'text-orange-400 border-orange-400' :
                              'text-muted-foreground border-muted-foreground'
                            }
                          >
                            {grievance.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
