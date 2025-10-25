import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Search, Bell, Plus, FileText, AlertTriangle, CheckCircle, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";
import type { ProjectWithRoads, Activity, SafetyIncident } from "@shared/schema";
import ProjectModal from "@/components/project-modal";

export default function Dashboard() {
  const { user } = useAuth();
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Fetch all projects
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch activities for all projects
  const projectIds = projects?.map(p => p.id) || [];
  
  const activitiesQueries = useQueries<Activity[][]>({
    queries: projectIds.map(projectId => ({
      queryKey: ["/api/projects", projectId, "activities"],
      queryFn: async () => {
        const res = await fetch(`/api/projects/${projectId}/activities`);
        if (!res.ok) throw new Error('Failed to fetch activities');
        return res.json();
      },
      enabled: !!projectId && !!projects,
    })),
  }) as { data?: Activity[], isLoading: boolean }[];

  // Fetch safety incidents for all projects
  const safetyIncidentsQueries = useQueries<SafetyIncident[][]>({
    queries: projectIds.map(projectId => ({
      queryKey: ["/api/projects", projectId, "safety-incidents"],
      queryFn: async () => {
        const res = await fetch(`/api/projects/${projectId}/safety-incidents`);
        if (!res.ok) throw new Error('Failed to fetch safety incidents');
        return res.json();
      },
      enabled: !!projectId && !!projects,
    })),
  }) as { data?: SafetyIncident[], isLoading: boolean }[];

  const isLoading = projectsLoading || activitiesQueries.some(q => q.isLoading) || safetyIncidentsQueries.some(q => q.isLoading);

  // Calculate metrics
  const calculateMetrics = () => {
    if (!projects) return { projectsOnSchedule: 0, budgetVariance: 0, openSafetyIssues: 0, onScheduleChange: 0, budgetChange: 0, safetyChange: 0 };

    const today = new Date();

    // Projects On Schedule - projects where end date is in the future and status is Active
    const projectsOnSchedule = projects.filter(p => {
      const endDate = new Date(p.endDate);
      return p.status === "Active" && endDate >= today;
    }).length;

    // Budget Variance - (totalSpent - totalBudget) / totalBudget * 100
    let totalBudget = 0;
    let totalSpent = 0;
    projects.forEach(project => {
      if (project.totalBudget) totalBudget += Number(project.totalBudget);
      if (project.spentAmount) totalSpent += Number(project.spentAmount);
    });
    const budgetVariance = totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget * 100) : 0;

    // Open Safety Issues - count unresolved incidents
    let openSafetyIssues = 0;
    safetyIncidentsQueries.forEach(query => {
      if (query.data) {
        openSafetyIssues += query.data.filter(incident => incident.status === "Open").length;
      }
    });

    // Mock trend data (in a real app, you'd compare with previous period)
    const onScheduleChange = 9;
    const budgetChange = -1.2;
    const safetyChange = 2;

    return {
      projectsOnSchedule,
      budgetVariance,
      openSafetyIssues,
      onScheduleChange,
      budgetChange,
      safetyChange,
    };
  };

  const metrics = calculateMetrics();

  // Calculate progress for a project (based on activities)
  const calculateProjectProgress = (projectId: string) => {
    const activitiesQuery = activitiesQueries.find((_, idx) => projectIds[idx] === projectId);
    if (!activitiesQuery?.data || activitiesQuery.data.length === 0) return 0;
    
    const totalProgress = activitiesQuery.data.reduce((sum, activity) => sum + activity.progress, 0);
    return Math.round(totalProgress / activitiesQuery.data.length);
  };

  // Determine project status based on deadline and progress
  const getProjectStatus = (project: ProjectWithRoads, progress: number) => {
    const today = new Date();
    const endDate = new Date(project.endDate);
    const daysUntilDeadline = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (endDate < today) {
      return { label: "Overdue", variant: "destructive" as const, color: "bg-red-100 text-red-700" };
    } else if (progress < 50 && daysUntilDeadline < 30) {
      return { label: "At Risk", variant: "secondary" as const, color: "bg-yellow-100 text-yellow-700" };
    } else {
      return { label: "On Track", variant: "default" as const, color: "bg-green-100 text-green-700" };
    }
  };

  // Get recent activities across all projects
  const getRecentActivities = () => {
    const allActivities: Array<{ activity: Activity; projectId: string; projectName: string }> = [];
    
    activitiesQueries.forEach((query, idx) => {
      if (query.data && projects) {
        query.data.forEach(activity => {
          allActivities.push({
            activity,
            projectId: projectIds[idx],
            projectName: projects[idx].name,
          });
        });
      }
    });

    // Sort by createdAt and take the 4 most recent
    return allActivities
      .sort((a, b) => new Date(b.activity.createdAt || '').getTime() - new Date(a.activity.createdAt || '').getTime())
      .slice(0, 4);
  };

  const recentActivities = getRecentActivities();

  // Format time ago
  const formatTimeAgo = (date: string | Date | null | undefined) => {
    if (!date) return 'Recently';
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <div className="ml-64 flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  className="pl-10 bg-gray-50 border-gray-200"
                  data-testid="input-search-projects"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-900"
                data-testid="button-notifications"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-900"
                data-testid="button-help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
                  <path strokeWidth="2" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="1"></circle>
                </svg>
              </Button>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.firstName?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="p-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64" data-testid="loading-state">
              <div className="text-gray-500">Loading dashboard...</div>
            </div>
          ) : (
            <>
              {/* Welcome Section */}
              <div className="mb-8 flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="page-title">
                    Welcome back, {user?.firstName || user?.username || 'User'}!
                  </h1>
                  <p className="text-gray-600" data-testid="page-subtitle">
                    Here is an overview of your active construction projects.
                  </p>
                </div>
                <Button
                  onClick={() => setShowProjectModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-create-project"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
              </div>

              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Projects On Schedule */}
                <Card className="border-none shadow-sm" data-testid="metric-projects-on-schedule">
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Projects On Schedule
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-2" data-testid="value-projects-on-schedule">
                      {metrics.projectsOnSchedule}
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {metrics.onScheduleChange}% from last month
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Variance */}
                <Card className="border-none shadow-sm" data-testid="metric-budget-variance">
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Budget Variance
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-2" data-testid="value-budget-variance">
                      {metrics.budgetVariance >= 0 ? '+' : ''}{metrics.budgetVariance.toFixed(1)}%
                    </div>
                    <div className="flex items-center text-sm text-red-600">
                      <TrendingDown className="w-4 h-4 mr-1" />
                      {Math.abs(metrics.budgetChange)}% from last month
                    </div>
                  </CardContent>
                </Card>

                {/* Open Safety Issues */}
                <Card className="border-none shadow-sm" data-testid="metric-open-safety-issues">
                  <CardContent className="p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      Open Safety Issues
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-2" data-testid="value-open-safety-issues">
                      {metrics.openSafetyIssues}
                    </div>
                    <div className="flex items-center text-sm text-orange-600">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {metrics.safetyChange} new this week
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Projects Section */}
              <Card className="border-none shadow-sm mb-8">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Active Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {projects && projects.length > 0 ? (
                    <Table data-testid="projects-table">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200">
                          <TableHead className="text-sm font-semibold text-gray-700">PROJECT NAME</TableHead>
                          <TableHead className="text-sm font-semibold text-gray-700">PROGRESS</TableHead>
                          <TableHead className="text-sm font-semibold text-gray-700">STATUS</TableHead>
                          <TableHead className="text-sm font-semibold text-gray-700">DEADLINE</TableHead>
                          <TableHead className="text-sm font-semibold text-gray-700"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects
                          .filter(p => p.status === "Active")
                          .slice(0, 4)
                          .map((project) => {
                            const progress = calculateProjectProgress(project.id);
                            const status = getProjectStatus(project, progress);
                            return (
                              <TableRow key={project.id} className="border-b border-gray-100" data-testid={`project-row-${project.id}`}>
                                <TableCell>
                                  <Link href={`/projects/${project.id}`}>
                                    <span className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer" data-testid={`link-project-name-${project.id}`}>
                                      {project.name}
                                    </span>
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3" data-testid="progress-container">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-32">
                                      <div 
                                        className={`h-2 rounded-full transition-all ${
                                          progress >= 75 ? 'bg-blue-600' :
                                          progress >= 50 ? 'bg-blue-500' :
                                          progress >= 25 ? 'bg-yellow-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${progress}%` }}
                                        data-testid="progress-bar"
                                      ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 w-12" data-testid="text-progress-value">
                                      {progress}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className={`${status.color} hover:${status.color} border-none`}
                                    data-testid="badge-project-status"
                                  >
                                    {status.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-600" data-testid="text-project-deadline">
                                  {new Date(project.endDate).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link href={`/projects/${project.id}`}>
                                    <span className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer" data-testid={`link-view-project-${project.id}`}>
                                      View
                                    </span>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12" data-testid="empty-state">
                      <div className="text-gray-400 mb-4">
                        <FileText className="w-16 h-16 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Projects</h3>
                      <p className="text-gray-500 mb-6">Get started by creating your first construction project.</p>
                      <Button 
                        onClick={() => setShowProjectModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Project
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bottom Section - Budget Allocation & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Budget Allocation */}
                <Card className="border-none shadow-sm" data-testid="card-budget-allocation">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Budget Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                      {/* Simple bar chart visualization */}
                      {projects && projects.slice(0, 6).map((project, idx) => {
                        const budgetPercent = project.totalBudget 
                          ? Math.min(100, (Number(project.spentAmount || 0) / Number(project.totalBudget)) * 100)
                          : 0;
                        return (
                          <div key={project.id} className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-gray-200 rounded-t" style={{ height: `${budgetPercent * 2}px` }}>
                              <div 
                                className="w-full bg-blue-400 rounded-t transition-all" 
                                style={{ height: '100%' }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="border-none shadow-sm" data-testid="card-recent-activity">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivities.length > 0 ? (
                        recentActivities.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3" data-testid={`activity-item-${idx}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              idx === 0 ? 'bg-blue-100' :
                              idx === 1 ? 'bg-yellow-100' :
                              idx === 2 ? 'bg-green-100' :
                              'bg-gray-100'
                            }`}>
                              {idx === 0 && <FileText className="w-4 h-4 text-blue-600" />}
                              {idx === 1 && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                              {idx === 2 && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {idx === 3 && <MessageSquare className="w-4 h-4 text-gray-600" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{item.activity.name}</span> for{' '}
                                <span className="font-medium">{item.projectName}</span>.
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(item.activity.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No recent activity</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
