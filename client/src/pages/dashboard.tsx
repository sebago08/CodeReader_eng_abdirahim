import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckCircle, DollarSign, Shield, Eye, Edit } from "lucide-react";
import type { ProjectWithRoads } from "@shared/schema";

export default function Dashboard() {
  const { data: projects = [], isLoading } = useQuery<ProjectWithRoads[]>({
    queryKey: ["/api/projects"],
  });

  // Calculate stats
  const activeProjects = projects.filter(p => p.status === "active").length;
  const completedTasks = 84; // Mock for now
  const totalBudget = projects.reduce((sum, p) => sum + parseFloat(p.contractAmount || "0"), 0);
  const budgetUsed = totalBudget * 0.76; // Mock 76% utilization
  const budgetPercentage = totalBudget > 0 ? Math.round((budgetUsed / totalBudget) * 100) : 0;
  const safetyIncidents = 0;

  const statCards = [
    {
      title: "Active Projects",
      value: activeProjects,
      subtitle: `+2 from last month`,
      icon: FolderKanban,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Completed Tasks",
      value: `${completedTasks}%`,
      subtitle: "Task completion rate",
      icon: CheckCircle,
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "Budget Utilization",
      value: `${budgetPercentage}%`,
      subtitle: `$${(budgetUsed / 1000000).toFixed(1)}M of $${(totalBudget / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
    },
    {
      title: "Safety Record",
      value: safetyIncidents,
      subtitle: "Zero incidents this month",
      icon: Shield,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
  ];

  return (
    <AppLayout breadcrumb={<h1 className="text-xl font-semibold">Project Dashboard</h1>}>
      <div className="p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.subtitle}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Active construction projects</CardDescription>
            </div>
            <Button asChild data-testid="button-new-project">
              <Link href="/projects">
                New Project
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No projects yet. Create your first project to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Project Name</th>
                      <th className="pb-3 font-medium">Project ID</th>
                      <th className="pb-3 font-medium">Client</th>
                      <th className="pb-3 font-medium">Start Date</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Progress</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.slice(0, 10).map((project) => {
                      // Calculate overall progress
                      const totalProgress = project.roads?.reduce((sum, road) => {
                        const roadProgress = road.layers?.reduce((layerSum, layer) => {
                          const completedLength = layer.progress?.reduce((pSum, p) => 
                            pSum + (parseFloat(p.endChainage) - parseFloat(p.startChainage)), 0) || 0;
                          const roadLength = parseFloat(road.length as string);
                          const layerPercentage = roadLength > 0 ? (completedLength / roadLength) * 100 : 0;
                          const layerWeight = layer.weight || 0;
                          return layerSum + (layerPercentage * (layerWeight / 100));
                        }, 0) || 0;
                        return sum + roadProgress;
                      }, 0) || 0;
                      const overallProgress = project.roads && project.roads.length > 0
                        ? Math.round(totalProgress / project.roads.length)
                        : 0;

                      return (
                        <tr 
                          key={project.id} 
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          data-testid={`row-project-${project.id}`}
                        >
                          <td className="py-4">
                            <div className="font-medium text-foreground">{project.name}</div>
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">
                            {project.projectNumber || "—"}
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">
                            {project.client || "—"}
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              project.status === 'active' 
                                ? 'bg-success/10 text-success' 
                                : project.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'Active'}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                                <div 
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${overallProgress}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-muted-foreground min-w-[40px]">
                                {overallProgress}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                data-testid={`button-view-${project.id}`}
                                title="View project"
                              >
                                <Link href={`/projects/${project.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                data-testid={`button-edit-${project.id}`}
                                title="Edit project"
                              >
                                <Link href={`/projects/${project.id}`}>
                                  <Edit className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
