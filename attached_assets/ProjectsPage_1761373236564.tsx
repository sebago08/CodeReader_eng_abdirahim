import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import { Project } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

interface ProjectsPageProps {
  projects: Project[];
  onCreateProject: () => void;
  onEditProject: (id: number) => void;
  onViewProject: (id: number) => void;
  onDeleteProject: (id: number) => void;
}

export function ProjectsPage({ projects, onCreateProject, onEditProject, onViewProject, onDeleteProject }: ProjectsPageProps) {
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-[#27ae60]/10 text-[#27ae60] hover:bg-[#27ae60]/20',
      completed: 'bg-[#3498db]/10 text-[#3498db] hover:bg-[#3498db]/20',
      'on-hold': 'bg-[#f39c12]/10 text-[#f39c12] hover:bg-[#f39c12]/20',
    };
    const labels = {
      active: 'Active',
      completed: 'Completed',
      'on-hold': 'On Hold',
    };
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <h1 className="text-[#1a5276]">Project Management</h1>
        <Button onClick={onCreateProject} className="bg-[#1a5276] hover:bg-[#14455f]">
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-[#1a5276]">All Projects</h2>
            <Input 
              type="text" 
              placeholder="Search projects..." 
              className="w-64"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Contract Value</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
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
                  <TableCell>{project.contractAmount}</TableCell>
                  <TableCell>{formatDate(project.startDate)}</TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
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
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => onDeleteProject(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
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
