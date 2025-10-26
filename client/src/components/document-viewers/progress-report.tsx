import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Save, X, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
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
  onSave?: (documentName: string, images?: { coverImage?: string; topLogo?: string; leftLogo?: string; rightLogo?: string }) => void;
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
  const [showImageUpload, setShowImageUpload] = useState(isPreview);
  const [coverImage, setCoverImage] = useState<string>('');
  const [topLogo, setTopLogo] = useState<string>('');
  const [leftLogo, setLeftLogo] = useState<string>('');
  const [rightLogo, setRightLogo] = useState<string>('');
  
  // Load images from document when editing
  useEffect(() => {
    if (document && isPreview) {
      const loadedImages = document.customContent as any;
      if (loadedImages) {
        if (loadedImages.coverImage) setCoverImage(loadedImages.coverImage);
        if (loadedImages.topLogo) setTopLogo(loadedImages.topLogo);
        if (loadedImages.leftLogo) setLeftLogo(loadedImages.leftLogo);
        if (loadedImages.rightLogo) setRightLogo(loadedImages.rightLogo);
      }
    }
  }, [document, isPreview]);
  
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

  const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = globalThis.document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.8 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedDataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (type: 'cover' | 'topLogo' | 'leftLogo' | 'rightLogo') => {
    const input = globalThis.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Compress image before storing
        const maxDimension = type === 'cover' ? 1200 : 800;
        const compressed = await compressImage(file, maxDimension, maxDimension);
        
        if (type === 'cover') setCoverImage(compressed);
        else if (type === 'topLogo') setTopLogo(compressed);
        else if (type === 'leftLogo') setLeftLogo(compressed);
        else if (type === 'rightLogo') setRightLogo(compressed);
      }
    };
    input.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveClick = () => {
    // If editing an existing document, save immediately without showing the dialog
    if (document && document.documentName) {
      const images = {
        coverImage: coverImage || undefined,
        topLogo: topLogo || undefined,
        leftLogo: leftLogo || undefined,
        rightLogo: rightLogo || undefined,
      };
      onSave?.(document.documentName, images);
    } else {
      // For new documents, show the dialog to enter a name
      const defaultName = `Monthly Progress Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      setDocumentName(defaultName);
      setShowSaveDialog(true);
    }
  };

  const handleConfirmSave = () => {
    if (documentName.trim() && onSave) {
      // Pass images along with document name
      const images = {
        coverImage: coverImage || undefined,
        topLogo: topLogo || undefined,
        leftLogo: leftLogo || undefined,
        rightLogo: rightLogo || undefined,
      };
      onSave(documentName.trim(), images);
      setShowSaveDialog(false);
    }
  };
  
  // Load images from document if viewing a saved document
  const loadedImages = document?.customContent as any;
  const displayCoverImage = coverImage || loadedImages?.coverImage || '';
  const displayTopLogo = topLogo || loadedImages?.topLogo || '';
  const displayLeftLogo = leftLogo || loadedImages?.leftLogo || '';
  const displayRightLogo = rightLogo || loadedImages?.rightLogo || '';

  return (
    <>
      {/* Header Section - Hidden on Print */}
      <div className="print:hidden bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={isPreview ? onCancel : onBack}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Button>
              {!isPreview && (
                <div>
                  <h2 className="text-lg font-semibold">{document?.documentName}</h2>
                  <p className="text-sm text-muted-foreground">
                    Created {document?.createdAt ? formatDate(document.createdAt) : ''}
                  </p>
                </div>
              )}
              {isPreview && (
                <div>
                  <h2 className="text-lg font-semibold">Document Preview</h2>
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
                    variant="default"
                    size="sm"
                    onClick={handlePrint}
                    data-testid="button-print-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Upload Section - Only in Preview Mode */}
      {isPreview && showImageUpload && (
        <div className="print:hidden bg-muted border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Top Logo (Organization/Municipality)</Label>
                <Button variant="outline" size="sm" onClick={() => handleImageUpload('topLogo')} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {displayTopLogo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {displayTopLogo && <img src={displayTopLogo} alt="Top Logo" className="mt-2 h-16 object-contain mx-auto" />}
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Cover Photo (Project Site)</Label>
                <Button variant="outline" size="sm" onClick={() => handleImageUpload('cover')} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {displayCoverImage ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {displayCoverImage && <img src={displayCoverImage} alt="Cover" className="mt-2 h-16 object-cover w-full rounded" />}
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Left Logo (Funding Organization)</Label>
                <Button variant="outline" size="sm" onClick={() => handleImageUpload('leftLogo')} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {displayLeftLogo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {displayLeftLogo && <img src={displayLeftLogo} alt="Left Logo" className="mt-2 h-16 object-contain mx-auto" />}
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Right Logo (Partner Organization)</Label>
                <Button variant="outline" size="sm" onClick={() => handleImageUpload('rightLogo')} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {displayRightLogo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {displayRightLogo && <img src={displayRightLogo} alt="Right Logo" className="mt-2 h-16 object-contain mx-auto" />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="max-w-5xl mx-auto print-content" data-testid="report-content">
        
        {/* Cover Page - Reduced margins for prominence */}
        <div className="page-break-after print:page-break-after-always mb-12 px-4 py-8">
          <div className="text-center space-y-8">
            {/* Top Logo */}
            {displayTopLogo && (
              <div className="flex justify-center mb-6">
                <img src={displayTopLogo} alt="Organization Logo" className="h-32 object-contain" />
              </div>
            )}
            
            {/* Client & Project Info */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold">{project.client}</h2>
              <h3 className="text-base font-semibold">{project.description || project.name}</h3>
            </div>

            {/* Project Title with Highlights */}
            <div className="space-y-2 my-6">
              <div className="bg-yellow-200 px-4 py-2 inline-block">
                <p className="text-sm font-semibold">{project.name}</p>
              </div>
              {project.projectNumber && (
                <div className="bg-yellow-200 px-4 py-2 inline-block block mt-2">
                  <p className="text-sm">Contract: {project.projectNumber}</p>
                </div>
              )}
              {project.contractorName && (
                <div className="bg-yellow-200 px-4 py-2 inline-block block mt-2">
                  <p className="text-sm">Contractor: {project.contractorName}</p>
                </div>
              )}
            </div>

            {/* Report Title */}
            <div className="my-8">
              <h1 className="text-2xl font-bold text-blue-600">
                MONTHLY PROGRESS REPORT {reportPeriod}
              </h1>
            </div>

            {/* Cover Photo */}
            {displayCoverImage && (
              <div className="my-4">
                <img src={displayCoverImage} alt="Project Site" className="w-full h-64 object-cover rounded shadow-lg" />
              </div>
            )}

            {/* Date */}
            <div className="mt-8">
              <h3 className="text-xl font-bold">{currentDate.toUpperCase()}</h3>
            </div>

            {/* Bottom Logos */}
            {(displayLeftLogo || displayRightLogo) && (
              <div className="flex justify-center items-center gap-12 mt-12">
                {displayLeftLogo && (
                  <img src={displayLeftLogo} alt="Funding Organization" className="h-16 object-contain" />
                )}
                {displayRightLogo && (
                  <img src={displayRightLogo} alt="Partner Organization" className="h-16 object-contain" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Pages - Normal padding */}
        <div className="px-6">
        {/* Table of Contents - Separate Page */}
        <div className="page-break-after print:page-break-after-always mb-12">
          <h2 className="text-xl font-bold mb-6" data-testid="heading-toc">TABLE OF CONTENTS</h2>
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
        </div>

        {/* 1. Introduction */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-introduction">1. INTRODUCTION</h2>
          
          <h3 className="text-lg font-semibold mb-2">1.1 Project Summary</h3>
          <p className="mb-4">{project.description || 'No description provided for this project.'}</p>
          
          <h3 className="text-lg font-semibold mb-2">1.2 Location and Extents of Works</h3>
          <p className="mb-4">
            <strong>Location:</strong> {project.location}<br />
            {project.scopeOfWork && (
              <><strong>Scope:</strong> {project.scopeOfWork}</>
            )}
          </p>
        </div>

        {/* 2. Project Information */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-project-info">2. PROJECT INFORMATION</h2>
          <h3 className="text-lg font-semibold mb-4">2.1 Project Summary - {project.projectNumber || 'N/A'}</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
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
        </div>

        {/* 3. Scope of Work */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-scope">3. SCOPE OF WORK</h2>
          <p>{project.scopeOfWork || 'No scope of work details provided.'}</p>
        </div>

        {/* 4. Progress */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-6 border-b-2 border-gray-300 pb-2" data-testid="heading-progress">4. PROGRESS</h2>
          
          {/* 4.1 Overall Progress */}
          <h3 className="text-lg font-semibold mb-4">4.1 Overall Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Completion Status</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Days Elapsed</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{timeElapsedPercentage}%</span>
                  <span className="text-sm">{daysElapsed} / {totalProjectDays} days</span>
                </div>
                <Progress value={timeElapsedPercentage} className="h-2" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Budget Used</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{financialProgress}%</span>
                </div>
                <Progress value={financialProgress} className="h-2" />
              </div>
            </div>
          </div>

          <div className="my-6 border-t border-gray-200"></div>

          {/* 4.2 Work Progress */}
          <h3 className="text-lg font-semibold mb-4">4.2 Work Progress</h3>
          {workPlanActivities.length > 0 ? (
            <div className="space-y-3">
              {workPlanActivities.map((activity: any) => (
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
            <p className="text-gray-600">No work plan activities recorded.</p>
          )}

          <div className="my-6 border-t border-gray-200"></div>

          {/* 4.3 Financial Progress */}
          <h3 className="text-lg font-semibold mb-4">4.3 Financial Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium mb-1">Contract Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(project.contractAmount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Total Certified</p>
              <p className="text-lg font-semibold">{formatCurrency(totalCertified.toString())}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Balance</p>
              <p className="text-lg font-semibold">{formatCurrency((contractAmount - totalCertified).toString())}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Financial Progress</p>
              <p className="text-lg font-semibold">{financialProgress}%</p>
            </div>
          </div>
          {paymentCertificates.length === 0 && (
            <p className="text-gray-600 text-sm">No payment certificates recorded for this project.</p>
          )}
        </div>

        {/* 5. Work Plan */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-workplan">5. WORK PLAN</h2>
          {workPlanActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
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
            <p className="text-gray-600">No work plan activities have been added to this project.</p>
          )}
        </div>

        {/* 6. Client Personnel */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-client-personnel">6. CLIENT PERSONNEL</h2>
          {clientPersonnel.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
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
            <p className="text-gray-600">No client personnel recorded for this project.</p>
          )}
        </div>

        {/* 7. Contractor Personnel */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-contractor-personnel">7. CONTRACTOR PERSONNEL</h2>
          {contractorPersonnel.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
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
            <p className="text-gray-600">No contractor personnel recorded for this project.</p>
          )}
        </div>

        {/* 8. Contractor's Equipment */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-equipment">8. CONTRACTOR'S EQUIPMENT</h2>
          {contractorEquipment.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
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
            <p className="text-gray-600">No contractor equipment recorded for this project.</p>
          )}
        </div>

        {/* 9. Issues and Concerns */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-300 pb-2" data-testid="heading-issues">9. ISSUES AND CONCERNS</h2>
          {safetyIncidents.length > 0 ? (
            <div className="space-y-3">
              {safetyIncidents.map((incident: any) => (
                <div key={incident.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{incident.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
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
            <p className="text-gray-600">No issues or concerns recorded for this project.</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-gray-300">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-sm font-semibold mb-2">Prepared by:</p>
              <p className="text-sm">{project.contractorContactPerson || 'Project Manager'}</p>
              <p className="text-sm text-gray-600">{project.contractorName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Reviewed by:</p>
              <p className="text-sm">{project.clientContactPerson || 'Client Representative'}</p>
              <p className="text-sm text-gray-600">{project.client}</p>
            </div>
          </div>
          <p className="text-sm text-center text-gray-600 mt-6">{currentDate}</p>
          <div className="my-4 border-t border-gray-200"></div>
          <p className="text-xs text-center text-gray-600">
            This report is confidential and intended solely for the use of {project.client}
          </p>
          <p className="text-xs text-center text-gray-600 mt-2">
            ConstructTrack Project Management System - {currentDate}
          </p>
        </div>
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
    </>
  );
}
