import { useState } from 'react';
import { ArrowLeft, Printer, Download, Save, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectDocument, ProjectWithRoads } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProgressReportProps {
  document?: ProjectDocument;
  project?: ProjectWithRoads;
  isPreview?: boolean;
  isSaving?: boolean;
  onSave?: (documentName: string) => void;
  onCancel?: () => void;
  onBack?: () => void;
}

export function ProgressReport({ 
  document, 
  project: projectProp,
  isPreview = false,
  isSaving = false,
  onSave,
  onCancel,
  onBack 
}: ProgressReportProps) {
  const { toast } = useToast();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [documentName, setDocumentName] = useState('');
  
  // Use either the document's snapshot or the direct project prop
  const project = (document?.projectSnapshot || projectProp) as unknown as ProjectWithRoads;
  
  // Safety check - if no project data, show error
  if (!project || !project.id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load project data</p>
          <Button onClick={isPreview ? onCancel : onBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const reportPeriod = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  }).toUpperCase();

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '$0.00';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  // Fetch related data using the snapshot data
  const { data: workPlanActivities = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', project.id, 'work-plan-activities'],
  });

  const { data: clientPersonnel = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', project.id, 'client-personnel'],
  });

  const { data: contractorPersonnel = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', project.id, 'contractor-personnel'],
  });

  const { data: contractorEquipment = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', project.id, 'contractor-equipment'],
  });

  const { data: paymentCertificates = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', project.id, 'payment-certificates'],
  });

  const { data: safetyIncidents = [] } = useQuery<any[]>({
    queryKey: ['/api/projects', project.id, 'safety-incidents'],
  });

  // Calculate progress
  const calculateProgress = () => {
    if (!project.roads || project.roads.length === 0) return 0;
    
    let totalProgress = 0;
    let layerCount = 0;

    project.roads.forEach(road => {
      road.layers?.forEach(layer => {
        // Calculate layer progress from progress records
        let layerProgress = 0;
        if (layer.progress && layer.progress.length > 0) {
          // Sum up completed chainages
          const totalCompleted = layer.progress.reduce((sum, p) => {
            const start = parseFloat(p.startChainage || '0');
            const end = parseFloat(p.endChainage || '0');
            return sum + (end - start);
          }, 0);
          
          // Calculate percentage based on road length
          const roadLength = parseFloat(road.length || '0');
          if (roadLength > 0) {
            layerProgress = Math.min(100, (totalCompleted / roadLength) * 100);
          }
        }
        
        totalProgress += layerProgress;
        layerCount++;
      });
    });

    return layerCount > 0 ? Math.round(totalProgress / layerCount) : 0;
  };

  const overallProgress = calculateProgress();

  // Calculate elapsed time
  const calculateElapsedTime = () => {
    const start = new Date(project.startDate);
    const today = new Date();
    const elapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return elapsed;
  };

  const totalDays = () => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysElapsed = calculateElapsedTime();
  const totalProjectDays = totalDays();
  const timeElapsedPercentage = totalProjectDays > 0 
    ? Math.min(100, Math.round((daysElapsed / totalProjectDays) * 100))
    : 0;

  // Financial calculations
  const contractAmount = parseFloat(project.contractAmount || '0');
  const advancePayment = parseFloat(project.advancePayment || '0');
  const totalCertified = paymentCertificates.reduce((sum: number, cert: any) => {
    return sum + parseFloat(cert.amountPaid || '0');
  }, 0) + advancePayment;
  const financialProgress = contractAmount > 0 ? Math.round((totalCertified / contractAmount) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast({
      title: "PDF Export",
      description: "PDF export functionality will be available in the next update.",
    });
  };

  const handleSaveClick = () => {
    // Set default name based on current date
    const defaultName = `Monthly Progress Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    setDocumentName(defaultName);
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    if (documentName.trim() && onSave) {
      onSave(documentName.trim());
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Actions - Hidden in print */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={isPreview ? onCancel : onBack}
                data-testid={isPreview ? "button-cancel" : "button-back"}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isPreview ? 'Cancel' : 'Back to Documents'}
              </Button>
              {!isPreview && document && (
                <div>
                  <h1 className="text-lg font-semibold" data-testid="text-document-name">{document.documentName}</h1>
                  <p className="text-sm text-muted-foreground">
                    Created {formatDate(document.createdAt)}
                  </p>
                </div>
              )}
              {isPreview && (
                <div>
                  <h1 className="text-lg font-semibold" data-testid="text-preview-title">Preview: Monthly Progress Report</h1>
                  <p className="text-sm text-muted-foreground">
                    Review and save this document
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isPreview ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSaving}
                    data-testid="button-cancel-preview"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    data-testid="button-save-document"
                    className="bg-[#1a5276] hover:bg-[#14455f]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Document'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    data-testid="button-print"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExportPDF}
                    data-testid="button-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 print:p-8" data-testid="report-content">
        {/* Cover Page */}
        <div className="mb-12 print:page-break-after-always">
          <div className="text-center space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2" data-testid="text-client">{project.client}</p>
              <h1 className="text-4xl font-bold mb-4" data-testid="text-project-name">{project.name}</h1>
            </div>
            
            <div className="space-y-2">
              <p className="text-muted-foreground">Contractor: {project.contractorName || 'Not specified'}</p>
              <p className="text-muted-foreground">Contract: {project.projectNumber || 'N/A'}</p>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-semibold">
                MONTHLY PROGRESS REPORT<br />
                {reportPeriod}
              </h2>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-toc">TABLE OF CONTENTS</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>1. INTRODUCTION</span></div>
              <div className="flex justify-between ml-4"><span>1.1 Project Summary</span></div>
              <div className="flex justify-between ml-4"><span>1.2 Location and Extents of Works</span></div>
              <div className="flex justify-between"><span>2. PROJECT INFORMATION</span></div>
              <div className="flex justify-between"><span>3. SCOPE OF WORK</span></div>
              <div className="flex justify-between"><span>4. PROGRESS</span></div>
              <div className="flex justify-between ml-4"><span>4.1 Overall Progress</span></div>
              <div className="flex justify-between ml-4"><span>4.2 Work Progress</span></div>
              <div className="flex justify-between ml-4"><span>4.3 Financial Progress</span></div>
              <div className="flex justify-between"><span>5. WORK PLAN</span></div>
              <div className="flex justify-between"><span>6. CLIENT PERSONNEL</span></div>
              <div className="flex justify-between"><span>7. CONTRACTOR PERSONNEL</span></div>
              <div className="flex justify-between"><span>8. CONTRACTOR'S EQUIPMENT</span></div>
              <div className="flex justify-between"><span>9. ISSUES AND CONCERNS</span></div>
            </div>
          </CardContent>
        </Card>

        {/* 1. Introduction */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-introduction">1. INTRODUCTION</h2>
            
            <h3 className="text-lg font-semibold mb-2">1.1 Project Summary</h3>
            <p className="text-muted-foreground mb-4">{project.description || 'No description provided for this project.'}</p>
            
            <h3 className="text-lg font-semibold mb-2">1.2 Location and Extents of Works</h3>
            <p className="text-muted-foreground mb-4">
              <strong>Location:</strong> {project.location}<br />
              {project.scopeOfWork && (
                <><strong>Scope:</strong> {project.scopeOfWork}</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* 2. Project Information */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-project-info">2. PROJECT INFORMATION</h2>
            <h3 className="text-lg font-semibold mb-4">2.1 Project Summary - {project.projectNumber || 'N/A'}</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-semibold">Item</th>
                    <th className="text-left py-2 px-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="py-2 px-4">1. Contractor</td><td className="py-2 px-4">{project.contractorName || '-'}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">2. Contract Sum (USD)</td><td className="py-2 px-4">{formatCurrency(project.contractAmount)}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">3. Source of funds</td><td className="py-2 px-4">{project.client}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">4. Start Date</td><td className="py-2 px-4">{formatDate(project.startDate)}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">5. Commencement date</td><td className="py-2 px-4">{formatDate(project.startDate)}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">6. Original Contract period</td><td className="py-2 px-4">{project.duration ? `${project.duration} Months` : '-'}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">7. Date of Completion</td><td className="py-2 px-4">{formatDate(project.endDate)}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">8. Period Elapsed</td><td className="py-2 px-4">{Math.round(daysElapsed / 30)} Months</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">9. Percentage of Time Elapsed</td><td className="py-2 px-4">{timeElapsedPercentage}%</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">10. Physical progress to date</td><td className="py-2 px-4">{overallProgress}%</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">11. Defects Liability Period</td><td className="py-2 px-4">{project.defectsLiabilityPeriod ? `${project.defectsLiabilityPeriod} months` : '-'}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">12. Total Amount certified to date</td><td className="py-2 px-4">{formatCurrency(totalCertified.toString())}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">13. Advance Payment</td><td className="py-2 px-4">{formatCurrency(project.advancePayment)}</td></tr>
                  <tr className="border-b"><td className="py-2 px-4">14. Percentage of amount certified to date</td><td className="py-2 px-4">{financialProgress}%</td></tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Scope of Work */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-scope">3. SCOPE OF WORK</h2>
            <p>{project.scopeOfWork || 'No scope of work details provided.'}</p>
          </CardContent>
        </Card>

        {/* 4. Progress */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-6" data-testid="heading-progress">4. PROGRESS</h2>
            
            {/* 4.1 Overall Progress */}
            <h3 className="text-lg font-semibold mb-4">4.1 Overall Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Completion Status</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Days Elapsed</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{timeElapsedPercentage}%</span>
                    <span className="text-sm text-muted-foreground">{daysElapsed} / {totalProjectDays} days</span>
                  </div>
                  <Progress value={timeElapsedPercentage} className="h-2" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Budget Used</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{financialProgress}%</span>
                  </div>
                  <Progress value={financialProgress} className="h-2" />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* 4.2 Work Progress */}
            <h3 className="text-lg font-semibold mb-4">4.2 Work Progress</h3>
            {workPlanActivities.length > 0 ? (
              <div className="space-y-3">
                {workPlanActivities.map((activity: any, index: number) => (
                  <div key={activity.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{activity.activityName}</span>
                      <Badge variant={activity.isMilestone ? "default" : "outline"}>
                        {activity.isMilestone ? "Milestone" : "Activity"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No work plan activities recorded.</p>
            )}

            <Separator className="my-6" />

            {/* 4.3 Financial Progress */}
            <h3 className="text-lg font-semibold mb-4">4.3 Financial Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contract Amount</p>
                <p className="text-lg font-semibold">{formatCurrency(project.contractAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Certified</p>
                <p className="text-lg font-semibold">{formatCurrency(totalCertified.toString())}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Balance</p>
                <p className="text-lg font-semibold">{formatCurrency((contractAmount - totalCertified).toString())}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Financial Progress</p>
                <p className="text-lg font-semibold">{financialProgress}%</p>
              </div>
            </div>
            {paymentCertificates.length === 0 && (
              <p className="text-muted-foreground text-sm">No payment certificates recorded for this project.</p>
            )}
          </CardContent>
        </Card>

        {/* 5. Work Plan */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-workplan">5. WORK PLAN</h2>
            {workPlanActivities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-semibold">Activity Name</th>
                      <th className="text-left py-2 px-4 font-semibold">Start Date</th>
                      <th className="text-left py-2 px-4 font-semibold">Duration</th>
                      <th className="text-left py-2 px-4 font-semibold">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workPlanActivities.map((activity: any) => (
                      <tr key={activity.id} className="border-b">
                        <td className="py-2 px-4">{activity.activityName}</td>
                        <td className="py-2 px-4">{formatDate(activity.startDate)}</td>
                        <td className="py-2 px-4">{activity.duration} days</td>
                        <td className="py-2 px-4">{formatDate(activity.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No work plan activities have been added to this project.</p>
            )}
          </CardContent>
        </Card>

        {/* 6. Client Personnel */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-client-personnel">6. CLIENT PERSONNEL</h2>
            {clientPersonnel.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-semibold">#</th>
                      <th className="text-left py-2 px-4 font-semibold">Name</th>
                      <th className="text-left py-2 px-4 font-semibold">Qualification</th>
                      <th className="text-left py-2 px-4 font-semibold">Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPersonnel.map((person: any, index: number) => (
                      <tr key={person.id} className="border-b">
                        <td className="py-2 px-4">{index + 1}.</td>
                        <td className="py-2 px-4">{person.name}</td>
                        <td className="py-2 px-4">{person.qualification || '-'}</td>
                        <td className="py-2 px-4">{person.designation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No client personnel recorded for this project.</p>
            )}
          </CardContent>
        </Card>

        {/* 7. Contractor Personnel */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-contractor-personnel">7. CONTRACTOR PERSONNEL</h2>
            {contractorPersonnel.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-semibold">#</th>
                      <th className="text-left py-2 px-4 font-semibold">Name</th>
                      <th className="text-left py-2 px-4 font-semibold">Qualification</th>
                      <th className="text-left py-2 px-4 font-semibold">Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractorPersonnel.map((person: any, index: number) => (
                      <tr key={person.id} className="border-b">
                        <td className="py-2 px-4">{index + 1}.</td>
                        <td className="py-2 px-4">{person.name}</td>
                        <td className="py-2 px-4">{person.qualification || '-'}</td>
                        <td className="py-2 px-4">{person.designation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No contractor personnel recorded for this project.</p>
            )}
          </CardContent>
        </Card>

        {/* 8. Contractor's Equipment */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-equipment">8. CONTRACTOR'S EQUIPMENT</h2>
            {contractorEquipment.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-semibold">#</th>
                      <th className="text-left py-2 px-4 font-semibold">Equipment Name</th>
                      <th className="text-left py-2 px-4 font-semibold">Type</th>
                      <th className="text-left py-2 px-4 font-semibold">Quantity</th>
                      <th className="text-left py-2 px-4 font-semibold">Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractorEquipment.map((equip: any, index: number) => (
                      <tr key={equip.id} className="border-b">
                        <td className="py-2 px-4">{index + 1}.</td>
                        <td className="py-2 px-4">{equip.equipmentName}</td>
                        <td className="py-2 px-4">{equip.type || '-'}</td>
                        <td className="py-2 px-4">{equip.quantity}</td>
                        <td className="py-2 px-4">{equip.condition || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No contractor equipment recorded for this project.</p>
            )}
          </CardContent>
        </Card>

        {/* 9. Issues and Concerns */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4" data-testid="heading-issues">9. ISSUES AND CONCERNS</h2>
            {safetyIncidents.length > 0 ? (
              <div className="space-y-3">
                {safetyIncidents.map((incident: any) => (
                  <div key={incident.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{incident.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Badge variant={incident.status === 'Resolved' ? 'default' : 'secondary'}>
                          {incident.status}
                        </Badge>
                        <span>{formatDate(incident.incidentDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No issues or concerns recorded for this project.</p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-sm font-semibold mb-2">Prepared by:</p>
              <p className="text-sm">{project.contractorContactPerson || 'Project Manager'}</p>
              <p className="text-sm text-muted-foreground">{project.contractorName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Reviewed by:</p>
              <p className="text-sm">{project.clientContactPerson || 'Client Representative'}</p>
              <p className="text-sm text-muted-foreground">{project.client}</p>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground mt-6">{currentDate}</p>
          <Separator className="my-4" />
          <p className="text-xs text-center text-muted-foreground">
            This report is confidential and intended solely for the use of {project.client}
          </p>
          <p className="text-xs text-center text-muted-foreground mt-2">
            ConstructTrack Project Management System - {currentDate}
          </p>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent data-testid="dialog-save-document">
          <DialogHeader>
            <DialogTitle>Save Document</DialogTitle>
            <DialogDescription>
              Enter a name for this document. You can edit it later if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-name">Document Name</Label>
              <Input
                id="document-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Monthly Progress Report - Oct 26, 2025"
                data-testid="input-document-name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && documentName.trim()) {
                    handleConfirmSave();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
              data-testid="button-cancel-save"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={!documentName.trim() || isSaving}
              data-testid="button-confirm-save"
              className="bg-[#1a5276] hover:bg-[#14455f]"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
