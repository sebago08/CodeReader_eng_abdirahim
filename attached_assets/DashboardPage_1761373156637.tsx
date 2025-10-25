'use client';

import { FolderKanban, CheckCircle, DollarSign, Shield, Eye, Edit, Plus } from 'lucide-react';
import { Project } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

interface DashboardPageProps {
  projects: Project[];
  onCreateProject: () => void;
  onEditProject: (id: number) => void;
  onViewProject: (id: number) => void;
}

export function DashboardPage({ projects, onCreateProject, onEditProject, onViewProject }: DashboardPageProps) {
  const activeProjects = projects.filter(p => p.status === 'active');
  const totalTasks = 152;
  const completedTasks = 128;
  const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <h1 className="text-[#1a5276]">Project Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center text-white">
            JS
          </div>
          <div>
            <div>John Smith</div>
            <div className="text-sm text-muted-foreground">Project Manager</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <Card className="hover:shadow-lg transition-transform hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div>Active Projects</div>
              <div className="w-12 h-12 rounded-lg bg-[#1a5276] flex items-center justify-center text-white">
                <FolderKanban className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl text-[#1a5276] my-2">
              {activeProjects.length}
            </div>
            <div className="text-sm text-muted-foreground">+2 from last month</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-transform hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div>Completed Tasks</div>
              <div className="w-12 h-12 rounded-lg bg-[#27ae60] flex items-center justify-center text-white">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl text-[#1a5276] my-2">
              {completionPercentage}%
            </div>
            <div className="text-sm text-muted-foreground">{completedTasks} of {totalTasks} tasks</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-transform hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div>Budget Utilization</div>
              <div className="w-12 h-12 rounded-lg bg-[#3498db] flex items-center justify-center text-white">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl text-[#1a5276] my-2">
              76%
            </div>
            <div className="text-sm text-muted-foreground">$3.8M of $5M</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-transform hover:-translate-y-1">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <div>Safety Record</div>
              <div className="w-12 h-12 rounded-lg bg-[#f39c12] flex items-center justify-center text-white">
                <Shield className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl text-[#1a5276] my-2">
              0
            </div>
            <div className="text-sm text-muted-foreground">Zero incidents this month</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-[#1a5276]">Recent Projects</h2>
            <Button onClick={onCreateProject} className="bg-[#1a5276] hover:bg-[#14455f]">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <button
                      onClick={() => onViewProject(project.id)}
                      className="text-[#1a5276] hover:text-[#3498db] hover:underline text-left transition-colors"
                    >
                      {project.name}
                    </button>
                  </TableCell>
                  <TableCell>{project.number}</TableCell>
                  <TableCell>{project.client.name}</TableCell>
                  <TableCell>{formatDate(project.startDate)}</TableCell>
                  <TableCell>
                    <Badge className="bg-[#27ae60]/10 text-[#27ae60] hover:bg-[#27ae60]/20">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="bg-gray-200 rounded-full h-2.5 w-full">
                        <div 
                          className="bg-gradient-to-r from-[#3498db] to-[#1a5276] h-2.5 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <div className="text-sm">{project.progress}%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => onViewProject(project.id)}
                        className="bg-[#1a5276] hover:bg-[#14455f]"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => onEditProject(project.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
