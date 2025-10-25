'use client';

import { ArrowLeft, Building2, MapPin, DollarSign, Calendar, TrendingUp, Users, HardHat, Edit, FileText } from 'lucide-react';
import { Project, DocumentType, BOQ, ProjectSummary, PlannedActivity } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ProjectDocumentsTab } from './ProjectDocumentsTab';
import { BOQModule } from './BOQModule';
import { WorkPlanTab } from './WorkPlanTab';
import { ProgressTab } from './ProgressTab';
import { useState } from 'react';
import { updateProject } from '../lib/actions/projects';
import { toast } from 'sonner';

interface ProjectDashboardProps {
  project: Project;
  onBack: () => void;
  onEditProject: () => void;
  onCreateDocument: (documentType: DocumentType) => void;
  onViewDocument: (documentId: string) => void;
  onUpdateProject?: (updatedProject: Project) => void;
}

export function ProjectDashboard({ project, onBack, onEditProject, onCreateDocument, onViewDocument, onUpdateProject }: ProjectDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const handleCreateBOQ = (boq: BOQ) => {
    const updatedProject = {
      ...project,
      boqs: [...(project.boqs || []), boq],
    };
    onUpdateProject?.(updatedProject);
  };

  const handleUpdateBOQ = (updatedBOQ: BOQ) => {
    const updatedProject = {
      ...project,
      boqs: (project.boqs || []).map(b => b.id === updatedBOQ.id ? updatedBOQ : b),
    };
    onUpdateProject?.(updatedProject);
  };

  const handleDeleteBOQ = (boqId: string) => {
    const updatedProject = {
      ...project,
      boqs: (project.boqs || []).filter(b => b.id !== boqId),
    };
    onUpdateProject?.(updatedProject);
  };

  const handleUpdateProjectSummary = (summary: ProjectSummary) => {
    const updatedProject = {
      ...project,
      projectSummary: summary,
    };
    onUpdateProject?.(updatedProject);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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

  const getActivityProgress = (activityId: string): number => {
    const tracking = project.progressTracking?.find(p => p.activityId === activityId);
    return tracking?.progress || 0;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-[#1a5276]">{project.name}</h1>
        </div>
        <div className="flex gap-3">
          <Button onClick={onEditProject} className="bg-[#1a5276] hover:bg-[#14455f]">
            <Edit className="w-4 h-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="boq">
            BOQ
            {project.boqs && project.boqs.length > 0 && (
              <Badge className="ml-2 bg-[#1a5276] text-white hover:bg-[#14455f]">
                {project.boqs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workplan">Work Plan</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {project.documents && project.documents.length > 0 && (
              <Badge className="ml-2 bg-[#1a5276] text-white hover:bg-[#14455f]">
                {project.documents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#1a5276]">
              <Building2 className="w-5 h-5" />
              Project ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{project.number}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#1a5276]">
              <MapPin className="w-5 h-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{project.location}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#1a5276]">
              <DollarSign className="w-5 h-5" />
              Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{project.contractAmount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#1a5276]">
              <Calendar className="w-5 h-5" />
              Start Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{formatDate(project.startDate)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a5276]">
              <TrendingUp className="w-5 h-5" />
              Project Status & Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                {getStatusBadge(project.status)}
              </div>
              
              {/* Physical Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span>Physical Progress</span>
                  <span className="text-[#1a5276]">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-4 [&>div]:bg-[#3498db]" />
              </div>

              {/* Financial Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span>Financial Progress</span>
                  <span className="text-[#1a5276]">
                    {(() => {
                      const contractAmount = parseFloat(project.contractAmount?.replace(/[$,]/g, '') || '0');
                      const advancePayment = parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0');
                      const certificatesTotal = project.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
                      const totalCertified = certificatesTotal + advancePayment;
                      const financialProgress = contractAmount > 0 ? Math.round((totalCertified / contractAmount) * 100 * 10) / 10 : 0;
                      return financialProgress;
                    })()}%
                  </span>
                </div>
                <Progress 
                  value={(() => {
                    const contractAmount = parseFloat(project.contractAmount?.replace(/[$,]/g, '') || '0');
                    const advancePayment = parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0');
                    const certificatesTotal = project.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
                    const totalCertified = certificatesTotal + advancePayment;
                    return contractAmount > 0 ? (totalCertified / contractAmount) * 100 : 0;
                  })()} 
                  className="h-4 [&>div]:bg-[#27ae60]" 
                />
              </div>

              {/* Time Lapse Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span>Time Lapse</span>
                  <span className="text-[#1a5276]">
                    {(() => {
                      const startDate = new Date(project.startDate);
                      const today = new Date();
                      const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                      
                      let totalDays = 0;
                      if (project.duration && project.durationUnit) {
                        totalDays = project.durationUnit === 'months' 
                          ? project.duration * 30 
                          : project.duration;
                      }
                      
                      const timeLapseProgress = totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100 * 10) / 10) : 0;
                      return timeLapseProgress;
                    })()}%
                  </span>
                </div>
                <Progress 
                  value={(() => {
                    const startDate = new Date(project.startDate);
                    const today = new Date();
                    const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                    
                    let totalDays = 0;
                    if (project.duration && project.durationUnit) {
                      totalDays = project.durationUnit === 'months' 
                        ? project.duration * 30 
                        : project.duration;
                    }
                    
                    return totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;
                  })()} 
                  className="h-4 [&>div]:bg-[#e74c3c]" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a5276]">
              <Users className="w-5 h-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p>{project.client.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact:</span>
                <p>{project.client.contact}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p>{project.client.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contractor and Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a5276]">
              <HardHat className="w-5 h-5" />
              Contractor Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p>{project.contractor.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact:</span>
                <p>{project.contractor.contact}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p>{project.contractor.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[#1a5276]">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {project.plannedActivities && project.plannedActivities.filter(activity => activity.isMilestone).length > 0 ? (
              <div className="space-y-3">
                {project.plannedActivities
                  .filter(activity => activity.isMilestone)
                  .map((milestone, index) => {
                    const tracking = project.progressTracking?.find(p => p.activityId === milestone.id);
                    const progress = tracking?.progress || 0;
                    const isCompleted = progress === 100;
                    
                    return (
                      <div key={milestone.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#3498db] transition-colors">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-[#27ae60] text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {isCompleted ? '✓' : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={isCompleted ? 'line-through text-gray-500' : ''}>{milestone.name}</h4>
                            <span className="text-sm text-muted-foreground ml-2">{progress}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(milestone.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No milestones defined for this project.</p>
            )}
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        <TabsContent value="boq">
          <BOQModule
            boqs={project.boqs || []}
            onCreateBOQ={handleCreateBOQ}
            onUpdateBOQ={handleUpdateBOQ}
            onDeleteBOQ={handleDeleteBOQ}
            projectName={project.name}
            projectSummary={project.projectSummary}
            onUpdateProjectSummary={handleUpdateProjectSummary}
          />
        </TabsContent>

        <TabsContent value="workplan">
          <WorkPlanTab
            projectId={project.id}
            activities={project.plannedActivities || []}
            onLocalUpdate={(updatedActivities: PlannedActivity[]) => {
              // Update local project state
              const updatedProject = {
                ...project,
                plannedActivities: updatedActivities,
              };
              onUpdateProject?.(updatedProject);
            }}
          />
        </TabsContent>

        <TabsContent value="progress">
          <ProgressTab
            projectId={project.id}
            activities={project.plannedActivities || []}
            progressTracking={project.progressTracking || []}
            paymentCertificates={project.paymentCertificates || []}
            advancePayment={project.advancePayment}
            contractAmount={project.contractAmount}
            workAccomplished={project.workAccomplished || []}
            onLocalUpdate={(data) => {
              // Update local project state
              const updatedProject = {
                ...project,
                progressTracking: data.progressTracking,
                paymentCertificates: data.paymentCertificates,
                advancePayment: data.advancePayment,
                workAccomplished: data.workAccomplished,
                progress: data.progress,
              };
              onUpdateProject?.(updatedProject);
            }}
          />
        </TabsContent>

        <TabsContent value="progress_old_remove_me">
          <Tabs defaultValue="progress-tracking" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="progress-tracking">Progress Tracking</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="updates">Updates</TabsTrigger>
            </TabsList>

            <TabsContent value="progress-tracking">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1a5276]">Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Project Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span>Overall Project Progress</span>
                      <span className="text-[#1a5276]">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-3 [&>div]:bg-[#1a5276]" />
                  </div>

                  {/* Activity Progress Table */}
                  {project.plannedActivities && project.plannedActivities.length > 0 ? (
                    <div>
                      <h4 className="mb-4 text-[#1a5276]">Activity Progress</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Activity Name</TableHead>
                            <TableHead className="text-center">Progress %</TableHead>
                            <TableHead>Progress Bar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {project.plannedActivities.map((activity) => {
                            const progress = getActivityProgress(activity.id);
                            return (
                              <TableRow key={activity.id}>
                                <TableCell>{activity.name}</TableCell>
                                <TableCell className="text-center">{progress}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={progress} className="h-2 flex-1 [&>div]:bg-[#1a5276]" />
                                    <span className="text-sm text-muted-foreground min-w-[45px]">{progress}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No activities to track.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1a5276]">Project Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.plannedActivities && project.plannedActivities.filter(activity => activity.isMilestone).length > 0 ? (
                    <div className="space-y-4">
                      {project.plannedActivities
                        .filter(activity => activity.isMilestone)
                        .map((milestone, index) => {
                          const tracking = project.progressTracking?.find(p => p.activityId === milestone.id);
                          const progress = tracking?.progress || 0;
                          const isCompleted = progress === 100;
                          
                          return (
                            <div key={milestone.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-[#3498db] transition-colors">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-[#27ae60] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {isCompleted ? '✓' : index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className={isCompleted ? 'line-through text-gray-500' : ''}>{milestone.name}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Target: {new Date(milestone.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Progress value={progress} className="h-2 flex-1 [&>div]:bg-[#3498db]" />
                                  <span className="text-sm">{progress}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No milestones defined for this project.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial">
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#1a5276]">Financial Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Contract Amount</p>
                      <p className="text-xl">${parseFloat(project.contractAmount?.replace(/[$,]/g, '') || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Total Certified</p>
                      <p className="text-xl">
                        ${(() => {
                          const advancePayment = parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0');
                          const certificatesTotal = project.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
                          return (certificatesTotal + advancePayment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Balance</p>
                      <p className="text-xl text-[#27ae60]">
                        ${(() => {
                          const contractAmount = parseFloat(project.contractAmount?.replace(/[$,]/g, '') || '0');
                          const advancePayment = parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0');
                          const certificatesTotal = project.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
                          const totalCertified = certificatesTotal + advancePayment;
                          return (contractAmount - totalCertified).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-muted-foreground">Financial Progress</p>
                        <p className="text-sm">
                          {(() => {
                            const contractAmount = parseFloat(project.contractAmount?.replace(/[$,]/g, '') || '0');
                            const advancePayment = parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0');
                            const certificatesTotal = project.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
                            const totalCertified = certificatesTotal + advancePayment;
                            return contractAmount > 0 ? Math.round((totalCertified / contractAmount) * 100 * 10) / 10 : 0;
                          })()}%
                        </p>
                      </div>
                      <Progress 
                        value={(() => {
                          const contractAmount = parseFloat(project.contractAmount?.replace(/[$,]/g, '') || '0');
                          const advancePayment = parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0');
                          const certificatesTotal = project.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
                          const totalCertified = certificatesTotal + advancePayment;
                          return contractAmount > 0 ? (totalCertified / contractAmount) * 100 : 0;
                        })()} 
                        className="h-2 [&>div]:bg-[#27ae60]" 
                      />
                    </div>
                  </div>

                  {/* Payment Certificates Table */}
                  <div>
                    <h4 className="mb-4 text-[#1a5276]">Payment Certificates</h4>
                    {(project.paymentCertificates && project.paymentCertificates.length > 0) || (project.advancePayment && parseFloat(project.advancePayment) > 0) ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Certificate No.</TableHead>
                              <TableHead>Amount (USD)</TableHead>
                              <TableHead>Date Certified</TableHead>
                              <TableHead>Payment Date/Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Advance Payment Row */}
                            {project.advancePayment && parseFloat(project.advancePayment) > 0 && (
                              <TableRow className="bg-blue-50">
                                <TableCell><strong>Advance Payment</strong></TableCell>
                                <TableCell>
                                  <strong>${parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                              </TableRow>
                            )}
                            
                            {/* Payment Certificates */}
                            {project.paymentCertificates?.map((cert) => (
                              <TableRow key={cert.id}>
                                <TableCell>{cert.certificateNo}</TableCell>
                                <TableCell>${cert.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell>{cert.dateCertified ? formatDate(cert.dateCertified) : '-'}</TableCell>
                                <TableCell>{cert.paymentDateStatus || '-'}</TableCell>
                              </TableRow>
                            ))}
                            
                            {/* Total Row */}
                            <TableRow className="bg-gray-100">
                              <TableCell><strong>Total</strong></TableCell>
                              <TableCell>
                                <strong>
                                  ${(() => {
                                    const advancePayment = parseFloat(project.advancePayment?.replace(/[$,]/g, '') || '0');
                                    const certificatesTotal = project.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
                                    return (certificatesTotal + advancePayment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                  })()}
                                </strong>
                              </TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">No payment certificates recorded for this project.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="updates">
              <div className="space-y-6">
                {/* Work Accomplished */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#1a5276]">Work Accomplished</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.workAccomplished && project.workAccomplished.length > 0 ? (
                      <ul className="space-y-3">
                        {project.workAccomplished.map((item, index) => (
                          <li key={index} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
                            <span className="text-[#27ae60] mt-1 flex-shrink-0">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground italic">No work accomplished items recorded yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Issues & Concerns */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#1a5276]">Issues & Concerns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.issuesAndConcerns && project.issuesAndConcerns.length > 0 ? (
                      <ul className="space-y-3">
                        {project.issuesAndConcerns.map((issue) => (
                          <li key={issue.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
                            <span className={`flex-shrink-0 mt-1 ${issue.status === 'resolved' ? 'text-[#27ae60]' : 'text-[#f39c12]'}`}>
                              {issue.status === 'resolved' ? '✓' : '⚠'}
                            </span>
                            <div className="flex-1">
                              <span className={issue.status === 'resolved' ? 'line-through text-muted-foreground' : ''}>
                                {issue.description}
                              </span>
                              {issue.comment && (
                                <p className="text-sm text-muted-foreground mt-2">Comment: {issue.comment}</p>
                              )}
                              {issue.status === 'resolved' && issue.resolvedDate && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Resolved: {formatDate(issue.resolvedDate)}
                                </p>
                              )}
                            </div>
                            <Badge className={issue.status === 'resolved' ? 'bg-[#27ae60]/10 text-[#27ae60]' : 'bg-[#f39c12]/10 text-[#f39c12]'}>
                              {issue.status === 'resolved' ? 'Resolved' : 'Outstanding'}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground italic">No issues or concerns reported.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="documents">
          <ProjectDocumentsTab
            project={project}
            onCreateDocument={onCreateDocument}
            onViewDocument={onViewDocument}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}