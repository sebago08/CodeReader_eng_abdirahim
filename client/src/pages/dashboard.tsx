import { useQuery } from "@tanstack/react-query";
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
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { DollarSign, Wallet, PiggyBank, AlertTriangle, TrendingUp, Calendar, LogOut } from "lucide-react";
import type { DashboardMetrics } from "@shared/schema";
import ProjectModal from "@/components/project-modal";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const { logoutMutation, user } = useAuth();

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid="text-dashboard-subtitle">
            Key financial and project metrics overview.
          </p>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                              Progress
                            </TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                              Due Date
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
                                {project.name}
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
                                <div className="flex items-center gap-3 min-w-[150px]">
                                  <Progress 
                                    value={project.progress} 
                                    className="flex-1 h-2" 
                                  />
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[45px]">
                                    {project.progress}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-600 dark:text-gray-400">
                                {project.dueDate ? format(new Date(project.dueDate), 'MMM dd, yyyy') : '-'}
                              </TableCell>
                              <TableCell>
                                <Link href={`/projects/${project.id}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    data-testid={`button-view-${project.id}`}
                                  >
                                    View
                                  </Button>
                                </Link>
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
        />
      )}
    </div>
  );
}
