import { useQuery, useQueries } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Search, Bell, Plus, AlertTriangle, Clock, FileText, DollarSign, Target, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ProjectWithRoads, DashboardMetrics, ProgressTracker } from "@shared/schema";
import ProjectModal from "@/components/project-modal";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  // Fetch all projects
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
  });

  const isLoading = metricsLoading || projectsLoading;

  // Get active projects
  const activeProjects = projects?.filter(p => p.status === "Active" || p.status === "On Track" || p.status === "At Risk" || p.status === "Behind") || [];

  // Fetch progress trackers for all projects to calculate real progress
  const projectIds = activeProjects.map(p => p.id);
  const progressQueries = useQueries({
    queries: projectIds.map(projectId => ({
      queryKey: ["/api/projects", projectId, "progress-trackers"],
      queryFn: async () => {
        const res = await fetch(`/api/projects/${projectId}/progress-trackers`);
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !!projectId,
    })),
  }) as { data?: ProgressTracker[], isLoading: boolean }[];

  // Calculate progress for a project based on road-length-weighted physical progress
  const calculateProjectProgress = (projectId: string) => {
    const project = activeProjects.find(p => p.id === projectId);
    if (!project || !project.roads || project.roads.length === 0) return 0;
    
    // Calculate total project length (only valid roads)
    const totalProjectLength = project.roads.reduce((sum, road) => {
      const roadLength = parseFloat(road.length);
      return !roadLength || roadLength <= 0 || isNaN(roadLength) ? sum : sum + roadLength;
    }, 0);
    
    if (totalProjectLength === 0) return 0;
    
    let weightedProgress = 0;
    
    project.roads.forEach(road => {
      const roadLength = parseFloat(road.length);
      // Skip roads with invalid lengths
      if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
        return;
      }
      
      const roadWeight = roadLength / totalProjectLength;
      const isDualCarriageway = road.carriageway === 'dual';
      
      if (road.layers && road.layers.length > 0) {
        let roadProgress = 0;
        let totalLayerWeight = 0;
        
        road.layers.forEach(layer => {
          const layerWeight = layer.weight || 1;
          totalLayerWeight += layerWeight;
          
          if (layer.progress && layer.progress.length > 0) {
            if (isDualCarriageway) {
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
        
        const thisRoadProgress = totalLayerWeight > 0 ? roadProgress / totalLayerWeight : 0;
        weightedProgress += thisRoadProgress * roadWeight;
      }
    });
    
    return Math.min(100, Math.round(weightedProgress));
  };

  // Get project status badge
  const getProjectStatusBadge = (status: string) => {
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
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:fixed md:left-0 md:top-0 md:h-screen">
        <Sidebar />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-64 md:pl-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-5">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Welcome back, {user?.firstName || user?.username}!</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                onClick={() => setShowProjectModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-create-project"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Project</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                data-testid="button-notifications"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 h-auto"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="w-8 h-8 md:w-10 md:h-10">
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-pink-600 text-white font-semibold">
                        {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate" data-testid="text-username">
                      {user?.username || user?.email || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await logoutMutation.mutateAsync();
                      queryClient.clear();
                      window.location.href = "/";
                    }}
                    className="cursor-pointer"
                    data-testid="button-sign-out"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="p-4 md:p-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="border-gray-200 dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Metrics Cards - 3 columns grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
                {/* Action Points Due Soon */}
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-action-points">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">Action Points Due Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                      {metrics?.actionPointsDueSoon.total || 0}
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-gray-600 dark:text-gray-400">Overdue: <span className="font-semibold text-gray-900 dark:text-white">{metrics?.actionPointsDueSoon.overdue || 0}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span className="text-gray-600 dark:text-gray-400">This Week: <span className="font-semibold text-gray-900 dark:text-white">{metrics?.actionPointsDueSoon.thisWeek || 0}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="text-gray-600 dark:text-gray-400">This Month: <span className="font-semibold text-gray-900 dark:text-white">{metrics?.actionPointsDueSoon.thisMonth || 0}</span></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Projects Behind Schedule */}
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-projects-behind">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">Projects Behind Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-3">
                      {metrics?.projectsBehindSchedule || 0}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Actual progress is lagging behind planned progress.
                    </p>
                  </CardContent>
                </Card>

                {/* Critical Safety Issues */}
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-safety-issues">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">Critical Safety Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-3">
                      {metrics?.criticalSafetyIssues.total || 0}
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        <span className="text-gray-600 dark:text-gray-400">High: <span className="font-semibold text-gray-900 dark:text-white">{metrics?.criticalSafetyIssues.high || 0}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span className="text-gray-600 dark:text-gray-400">Medium: <span className="font-semibold text-gray-900 dark:text-white">{metrics?.criticalSafetyIssues.medium || 0}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="text-gray-600 dark:text-gray-400">Low: <span className="font-semibold text-gray-900 dark:text-white">{metrics?.criticalSafetyIssues.low || 0}</span></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Overdue Pre-Commencement Docs */}
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-overdue-docs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">Overdue Pre-Commencement Docs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                      {metrics?.overduePreCommencementDocs || 0}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Documents requiring immediate attention.
                    </p>
                  </CardContent>
                </Card>

                {/* Pending Payment Certificates */}
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-pending-payments">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">Pending Payment Certificates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                      {metrics?.pendingPaymentCertificates || 0}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Awaiting approval or processing.
                    </p>
                  </CardContent>
                </Card>

                {/* Upcoming Milestones */}
                <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800" data-testid="card-upcoming-milestones">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">Upcoming Milestones (30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                      {metrics?.upcomingMilestones || 0}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Key project deadlines approaching.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Projects Table */}
              <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Active Projects</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No active projects found</p>
                      <Button onClick={() => setShowProjectModal(true)} data-testid="button-create-first-project">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-gray-700">
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">PROJECT NAME</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">STATUS</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">PROGRESS</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">DUE DATE</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeProjects.map((project) => {
                            const progress = calculateProjectProgress(project.id);
                            return (
                              <TableRow key={project.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50" data-testid={`row-project-${project.id}`}>
                                <TableCell className="font-medium text-gray-900 dark:text-white">
                                  {project.name}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className={`border ${getProjectStatusBadge(project.status)}`}
                                    data-testid={`badge-status-${project.id}`}
                                  >
                                    {project.status === "Active" ? "On Track" : project.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <Progress value={progress} className="flex-1 h-2" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-600 dark:text-gray-400">
                                  {project.endDate ? format(new Date(project.endDate), 'MMM dd, yyyy') : '-'}
                                </TableCell>
                                <TableCell>
                                  <Link href={`/projects/${project.id}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                      data-testid={`button-view-${project.id}`}
                                    >
                                      View
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
          onSuccess={() => {
            setShowProjectModal(false);
            refetchProjects();
          }}
        />
      )}
    </div>
  );
}
