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
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { DollarSign, Wallet, PiggyBank, AlertTriangle, TrendingUp, Calendar, LogOut, Plus, MoreVertical, Copy, Trash2, MessageSquare } from "lucide-react";
import type { DashboardMetrics } from "@shared/schema";
import ProjectModal from "@/components/project-modal";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
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
      "On Track": "bg-green-100 text-green-800 border-green-200",
      "Active": "bg-green-100 text-green-800 border-green-200",
      "At Risk": "bg-orange-100 text-orange-800 border-orange-200",
      "Behind": "bg-red-100 text-red-800 border-red-200",
      "Delayed": "bg-red-100 text-red-800 border-red-200",
      "Completed": "bg-blue-100 text-blue-800 border-blue-200",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">
        <Sidebar />
      </div>
      
      <MobileNav />
      
      <div className="flex-1 md:ml-64">
        {/* Top Bar with User Info */}
        <header className="bg-black text-white shadow-lg">
          <div className="w-full px-4 md:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-hard-hat text-lg"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold">ConstructTrack</h1>
                  <p className="text-white/80 text-sm">Professional Construction Management</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {user && (
                  <div className="text-white" data-testid="text-current-username">
                    <span className="text-sm text-white/60">Signed in as:</span>
                    <span className="ml-2 font-medium">{user.username}</span>
                  </div>
                )}
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                  data-testid="button-logout"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-dashboard-title">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid="text-dashboard-subtitle">
                Key financial and project metrics overview.
              </p>
            </div>
            <Button
              onClick={() => setShowProjectModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-create-project"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Project
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse mb-4"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-gray-200 dark:border-gray-700">
                    <CardContent className="pt-6">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse mb-4"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-financial-total">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Financial Total
                        </p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-financial-total">
                          ${formatCurrency(metrics?.financialTotal || 0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Total budget across all projects
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-amount-spent">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Wallet className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Amount Spent
                        </p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-amount-spent">
                          ${formatCurrency(metrics?.amountSpent || 0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Total expenditure to date
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-current-balance">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <PiggyBank className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Current Balance
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-current-balance">
                          ${formatCurrency(metrics?.currentBalance || 0)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Remaining budget available
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-projects-behind">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Projects Behind Schedule
                        </p>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-projects-behind">
                          {metrics?.projectsBehindSchedule || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Requiring immediate attention
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-safety-issues">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Critical Safety Issues
                        </p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400" data-testid="text-safety-issues-total">
                          {metrics?.criticalSafetyIssues.total || 0}
                        </p>
                        <div className="flex gap-3 text-xs mt-2">
                          <span className="text-red-600 dark:text-red-400" data-testid="text-safety-high">
                            High: {metrics?.criticalSafetyIssues.high || 0}
                          </span>
                          <span className="text-orange-600 dark:text-orange-400" data-testid="text-safety-medium">
                            Medium: {metrics?.criticalSafetyIssues.medium || 0}
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400" data-testid="text-safety-low">
                            Low: {metrics?.criticalSafetyIssues.low || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-incident-reports">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Open Incident Reports
                        </p>
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-incident-reports-total">
                          {metrics?.openIncidentReports?.total || 0}
                        </p>
                        <div className="flex gap-3 text-xs mt-2">
                          <span className="text-red-600 dark:text-red-400" data-testid="text-incidents-severe">
                            Severe: {metrics?.openIncidentReports?.severe || 0}
                          </span>
                          <span className="text-orange-600 dark:text-orange-400" data-testid="text-incidents-serious">
                            Serious: {metrics?.openIncidentReports?.serious || 0}
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400" data-testid="text-incidents-indicative">
                            Indicative: {metrics?.openIncidentReports?.indicative || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-open-grievances">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Open Grievances
                        </p>
                        <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400" data-testid="text-grievances-total">
                          {metrics?.openGrievances?.total || 0}
                        </p>
                        <div className="flex gap-3 text-xs mt-2">
                          <span className="text-blue-600 dark:text-blue-400" data-testid="text-grievances-registered">
                            Registered: {metrics?.openGrievances?.registered || 0}
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400" data-testid="text-grievances-investigating">
                            Investigating: {metrics?.openGrievances?.underInvestigation || 0}
                          </span>
                          <span className="text-red-600 dark:text-red-400" data-testid="text-grievances-escalated">
                            Escalated: {metrics?.openGrievances?.escalated || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-upcoming-milestones">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Calendar className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Upcoming Milestones (30 Days)
                        </p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-upcoming-milestones">
                          {metrics?.upcomingMilestones || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Key deadlines approaching
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4" data-testid="text-active-projects-title">
                    Active Projects
                  </h2>
                  {!metrics?.activeProjects || metrics.activeProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No active projects found</p>
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
                          <TableRow className="border-gray-200 dark:border-gray-700">
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Project Name
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Financial
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Time
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Physical
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Due Date
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Grievances
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metrics.activeProjects.map((project) => (
                            <TableRow 
                              key={project.id} 
                              className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              data-testid={`row-project-${project.id}`}
                            >
                              <TableCell className="font-medium text-gray-900 dark:text-white">
                                <Link href={`/projects/${project.id}`}>
                                  <span className="hover:underline cursor-pointer text-blue-600 dark:text-blue-400" data-testid={`link-project-name-${project.id}`}>
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
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[35px]">
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
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[35px]">
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
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[35px]">
                                    {project.physicalProgress}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">
                                {project.dueDate ? format(new Date(project.dueDate), 'MMM dd, yyyy') : '-'}
                              </TableCell>
                              <TableCell>
                                {project.openGrievances && project.openGrievances > 0 ? (
                                  <Badge 
                                    className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100 border-cyan-200"
                                    data-testid={`badge-grievances-${project.id}`}
                                  >
                                    {project.openGrievances}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm" data-testid={`text-grievances-${project.id}`}>0</span>
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
                                      className="text-red-600 dark:text-red-400"
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
    </div>
  );
}
