import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sidebar } from "@/components/sidebar";
import { Briefcase, CheckCircle, DollarSign, Shield, Eye, Edit, Plus } from "lucide-react";
import type { ProjectWithRoads, Activity, SafetyIncident } from "@shared/schema";

export default function Dashboard() {
  // Fetch all projects
  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithRoads[]>({
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
    if (!projects) return { activeProjects: 0, completedTasks: 0, budgetUtilization: 0, safetyIncidents: 0 };

    // Active Projects
    const activeProjects = projects.filter(p => p.status === "Active").length;

    // Completed Tasks % - average of all activity progress values across all projects
    let totalProgress = 0;
    let totalActivities = 0;
    activitiesQueries.forEach(query => {
      if (query.data) {
        query.data.forEach(activity => {
          totalProgress += activity.progress;
          totalActivities++;
        });
      }
    });
    const completedTasks = totalActivities > 0 ? Math.round(totalProgress / totalActivities) : 0;

    // Budget Utilization - (sum of spentAmount / sum of totalBudget) * 100
    let totalBudget = 0;
    let totalSpent = 0;
    projects.forEach(project => {
      if (project.totalBudget) totalBudget += Number(project.totalBudget);
      if (project.spentAmount) totalSpent += Number(project.spentAmount);
    });
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Safety Record - count incidents from current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    let monthlyIncidents = 0;
    safetyIncidentsQueries.forEach(query => {
      if (query.data) {
        query.data.forEach(incident => {
          const incidentDate = new Date(incident.incidentDate);
          if (incidentDate.getMonth() === currentMonth && incidentDate.getFullYear() === currentYear) {
            monthlyIncidents++;
          }
        });
      }
    });

    return {
      activeProjects,
      completedTasks,
      budgetUtilization,
      safetyIncidents: monthlyIncidents,
      totalBudget,
      totalSpent,
    };
  };

  const metrics = calculateMetrics();

  // Calculate progress for a project (based on roads and layers)
  const calculateProjectProgress = (project: ProjectWithRoads) => {
    if (!project.roads || project.roads.length === 0) return 0;
    
    let totalProgress = 0;
    let totalWeight = 0;
    
    project.roads.forEach(road => {
      if (road.layers && road.layers.length > 0) {
        road.layers.forEach(layer => {
          const layerWeight = layer.weight || 1;
          totalWeight += layerWeight;
          
          if (layer.progress && layer.progress.length > 0) {
            const completedLength = layer.progress.reduce((sum, prog) => {
              return sum + (Number(prog.endChainage) - Number(prog.startChainage));
            }, 0);
            
            const layerProgress = (completedLength / Number(road.length)) * 100;
            totalProgress += layerProgress * layerWeight;
          }
        });
      }
    });
    
    return totalWeight > 0 ? Math.min(100, Math.round(totalProgress / totalWeight)) : 0;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <div className="ml-64 flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900" data-testid="page-title">
                Project Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your project overview</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  JS
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900" data-testid="user-name">John Smith</div>
                  <div className="text-xs text-gray-500">Project Manager</div>
                </div>
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
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Active Projects */}
                <Card className="border-none shadow-sm" data-testid="metric-active-projects">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Active Projects
                    </CardTitle>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900" data-testid="value-active-projects">
                      {metrics.activeProjects}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      +2 from last month
                    </p>
                  </CardContent>
                </Card>

                {/* Completed Tasks */}
                <Card className="border-none shadow-sm" data-testid="metric-completed-tasks">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Completed Tasks
                    </CardTitle>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900" data-testid="value-completed-tasks">
                      {metrics.completedTasks}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Task completion rate
                    </p>
                  </CardContent>
                </Card>

                {/* Budget Utilization */}
                <Card className="border-none shadow-sm" data-testid="metric-budget-utilization">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Budget Utilization
                    </CardTitle>
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900" data-testid="value-budget-utilization">
                      {metrics.budgetUtilization}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ${((metrics.totalSpent || 0) / 1000000).toFixed(1)}M of ${((metrics.totalBudget || 0) / 1000000).toFixed(1)}M
                    </p>
                  </CardContent>
                </Card>

                {/* Safety Record */}
                <Card className="border-none shadow-sm" data-testid="metric-safety-record">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Safety Record
                    </CardTitle>
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900" data-testid="value-safety-record">
                      {metrics.safetyIncidents}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {metrics.safetyIncidents === 0 ? "Zero incidents this month" : "Incidents this month"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Projects Section */}
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Recent Projects
                    </CardTitle>
                    <Link href="/projects">
                      <Button 
                        className="bg-[#1e3a4f] hover:bg-[#2d5366] text-white"
                        data-testid="button-new-project"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {projects && projects.length > 0 ? (
                    <Table data-testid="projects-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project Name</TableHead>
                          <TableHead>Project ID</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.slice(0, 5).map((project) => {
                          const progress = calculateProjectProgress(project);
                          return (
                            <TableRow key={project.id} data-testid={`project-row-${project.id}`}>
                              <TableCell className="font-medium" data-testid="text-project-name">
                                {project.name}
                              </TableCell>
                              <TableCell className="text-gray-600" data-testid="text-project-id">
                                {project.id.substring(0, 8).toUpperCase()}
                              </TableCell>
                              <TableCell className="text-gray-600" data-testid="text-project-client">
                                {project.client}
                              </TableCell>
                              <TableCell className="text-gray-600" data-testid="text-project-start-date">
                                {new Date(project.startDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={project.status === "Active" ? "default" : "secondary"}
                                  className={
                                    project.status === "Active" 
                                      ? "bg-green-100 text-green-700 hover:bg-green-100" 
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                                  }
                                  data-testid="badge-project-status"
                                >
                                  {project.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3" data-testid="progress-container">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${progress}%` }}
                                      data-testid="progress-bar"
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 w-12" data-testid="text-progress-value">
                                    {progress}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Link href={`/projects/${project.id}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 text-[#1e3a4f] hover:bg-blue-50"
                                      data-testid="button-view-project"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  <Link href={`/projects/${project.id}`}>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 w-8 p-0 text-[#1e3a4f] hover:bg-blue-50"
                                      data-testid="button-edit-project"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12" data-testid="empty-state">
                      <div className="text-gray-400 mb-4">
                        <Briefcase className="w-16 h-16 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Yet</h3>
                      <p className="text-gray-500 mb-6">Get started by creating your first construction project.</p>
                      <Link href="/projects">
                        <Button className="bg-[#1e3a4f] hover:bg-[#2d5366] text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Project
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
