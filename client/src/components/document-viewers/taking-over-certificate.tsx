import { ArrowLeft, Download, Save, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Type definitions
interface Project {
  id?: string;
  number?: string;
  name?: string;
  location?: string;
  contractAmount?: string;
  client?: { name?: string; logo?: string; address?: string; phone?: string; email?: string; contact?: string };
  contractor?: { name?: string; contact?: string };
}

interface SavedDocumentData {
  projectSnapshot?: any;
  customContent?: any;
  savedAt?: string;
}

interface TakingOverCertificateProps {
  project: Project;
  documentId: string;
  savedData?: SavedDocumentData;
  onBack: () => void;
  onSave: (documentId: string, documentName: string, customContent?: any) => void;
}

export function TakingOverCertificate({ project, documentId, savedData, onBack, onSave }: TakingOverCertificateProps) {
  // Use saved data if available, otherwise use live project data
  const displayProject = savedData?.projectSnapshot || project;
  const isSaved = !!savedData;
  const [certificateNumber, setCertificateNumber] = useState(`TOC-${project.number}-${new Date().getFullYear()}`);
  const [certificateDate, setCertificateDate] = useState(new Date().toISOString().split('T')[0]);
  const [takingOverDate, setTakingOverDate] = useState(new Date().toISOString().split('T')[0]);
  const [outstandingWork, setOutstandingWork] = useState('None at the time of Taking Over');
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    // Use the browser's native print dialog
    window.print();
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('certificate-content');
      if (!element) return;

      // Create a clone of the certificate to modify for PDF
      const certificateClone = element.cloneNode(true) as HTMLElement;
      
      // Apply PDF-specific styles
      certificateClone.style.backgroundColor = '#ffffff';
      certificateClone.style.color = '#000000';
      certificateClone.style.position = 'absolute';
      certificateClone.style.left = '-9999px';
      certificateClone.style.top = '0';
      
      document.body.appendChild(certificateClone);
      
      // Strip ALL classes and convert to inline styles to avoid oklch colors
      const allElements = certificateClone.querySelectorAll('*');
      allElements.forEach((el) => {
        const element = el as HTMLElement;
        
        try {
          const computedStyle = window.getComputedStyle(element);
          
          // Store the computed styles we want to preserve
          const styles: { [key: string]: string } = {};
          
          // Copy only safe, essential styles
          const safeProperties = [
            'display', 'position', 'top', 'left', 'right', 'bottom',
            'width', 'height', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
            'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
            'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign',
            'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gap',
            'gridTemplateColumns', 'gridTemplateRows', 'gridGap',
            'borderWidth', 'borderStyle', 'borderRadius',
            'boxSizing', 'overflow', 'overflowX', 'overflowY', 'whiteSpace'
          ];
          
          safeProperties.forEach(prop => {
            const value = (computedStyle as any)[prop];
            if (value && value !== '' && value !== 'none') {
              styles[prop] = value;
            }
          });
          
          // Handle colors separately with safe fallbacks
          const textColor = computedStyle.color;
          if (textColor && !textColor.includes('oklab') && !textColor.includes('oklch')) {
            styles.color = textColor;
          } else {
            styles.color = '#000000';
          }
          
          const bgColor = computedStyle.backgroundColor;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            if (!bgColor.includes('oklab') && !bgColor.includes('oklch')) {
              styles.backgroundColor = bgColor;
            } else {
              styles.backgroundColor = '#ffffff';
            }
          }
          
          const borderColor = computedStyle.borderColor;
          if (borderColor && !borderColor.includes('oklab') && !borderColor.includes('oklch')) {
            styles.borderColor = borderColor;
          } else if (computedStyle.borderWidth && computedStyle.borderWidth !== '0px') {
            styles.borderColor = '#d1d5db';
          }
          
          // Remove ALL class attributes
          element.removeAttribute('class');
          
          // Apply the safe styles as inline styles
          Object.entries(styles).forEach(([prop, value]) => {
            (element.style as any)[prop] = value;
          });
        } catch (e) {
          // If we can't process an element, just remove its classes
          element.removeAttribute('class');
        }
      });

      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(certificateClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI (210mm)
        height: 1123 // A4 height in pixels at 96 DPI (297mm)
      });

      // Remove the clone from DOM
      document.body.removeChild(certificateClone);

      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with A4 portrait dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      
      // Add image to fill entire page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Taking_Over_Certificate_${project.number}_${certificateDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSaveDocument = () => {
    const documentName = window.prompt(
      'Enter document name:',
      `Taking Over Certificate - ${project?.number || 'New'}`
    );
    if (documentName && documentName.trim()) {
      onSave(documentId, documentName.trim(), {
        certificateNumber,
        certificateDate,
        takingOverDate,
        outstandingWork
      });
    }
  };

  return (
    <div>
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border print:hidden">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          <h1 className="text-[#1a5276]">Taking Over Certificate</h1>
          {isSaved ? (
            <Badge className="bg-[#27ae60] text-white hover:bg-[#27ae60]">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Saved {savedData?.savedAt ? new Date(savedData.savedAt).toLocaleDateString() : ''}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[#f39c12] border-[#f39c12]">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved
            </Badge>
          )}
        </div>
        <div className="flex gap-3">
          {!isSaved && (
            <Button 
              onClick={handleSaveDocument} 
              className="bg-[#27ae60] hover:bg-[#27ae60]/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Document
            </Button>
          )}
          <Button 
            onClick={handlePrint}
            className="bg-[#1a5276] hover:bg-[#14455f] text-white"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
          <Button 
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Certificate Content - A4 Portrait (210mm x 297mm) */}
      <div className="bg-white w-[210mm] h-[297mm] mx-auto shadow-lg overflow-hidden" id="certificate-content">
        <div className="p-12 h-full flex flex-col print-content">
          {/* Letterhead */}
          <div className="mb-6 pb-6 border-b-2 border-[#1a5276]">
            <div className="flex justify-between items-start gap-6">
              {displayProject?.client?.logo && (
                <div className="flex-shrink-0">
                  <img 
                    src={displayProject?.client?.logo} 
                    alt={displayProject?.client?.name || "Client Name"}
                    className="h-28 w-auto object-contain"
                  />
                </div>
              )}
              <div className="text-right flex-1">
                <h2 className="text-[#1a5276] mb-1 text-[18px]">{displayProject?.client?.name || "Client Name"}</h2>
                <p className="text-[13px] text-muted-foreground">{displayProject?.client?.address}</p>
                <p className="text-[13px] text-muted-foreground">{displayProject?.client?.phone}</p>
                <p className="text-[13px] text-muted-foreground">{displayProject?.client?.email}</p>
              </div>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center mb-6">
            <h1 className="text-[#1a5276] mb-2 text-[28px] font-bold">TAKING OVER CERTIFICATE</h1>
            <p className="text-[13px] text-muted-foreground">Certificate No: {certificateNumber}</p>
          </div>

          {/* Project Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3 text-[14px]">
                <div>
                  <span className="text-muted-foreground text-[13px]">Date of Issue:</span>
                  <p className="text-[#1a5276]">{formatDate(certificateDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[13px]">Taking Over Date:</span>
                  <p className="text-[#1a5276]">{formatDate(takingOverDate)}</p>
                </div>
              </div>
              
              <div className="border-t pt-2.5 mt-3 text-[14px]">
                <span className="text-muted-foreground text-[13px]">Project Name:</span>
                <p className="text-[#1a5276]">{displayProject.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[14px]">
                <div>
                  <span className="text-muted-foreground text-[13px]">Project Number:</span>
                  <p>{displayProject.number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[13px]">Location:</span>
                  <p>{displayProject.location}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[14px]">
                <div>
                  <span className="text-muted-foreground text-[13px]">Employer:</span>
                  <p>{displayProject?.client?.name || "Client Name"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[13px]">Contractor:</span>
                  <p>{displayProject?.contractor?.name || "Contractor Name"}</p>
                </div>
              </div>

              <div className="text-[14px]">
                <span className="text-muted-foreground text-[13px]">Contract Amount:</span>
                <p>{displayProject.contractAmount}</p>
              </div>
            </div>
          </div>

          {/* Certificate Body */}
          <div className="mb-5 flex-grow">
            <h3 className="text-[#1a5276] mb-3 text-[18px]">CERTIFICATE</h3>
            
            <p className="mb-2 leading-relaxed text-[14px]">
              In accordance with Sub-Clause 10.1 of the Conditions of Contract, I hereby certify that the Works described as <span className="italic">"{displayProject.name}"</span> - <span dangerouslySetInnerHTML={{ __html: displayProject.scope }} /> were substantially completed in accordance with the Contract on <strong>{formatDate(takingOverDate)}</strong>.
            </p>

            <p className="leading-relaxed mt-3 text-[14px]">
              The Works are now taken over by the Employer, and the Defects Notification Period commences from the above date in accordance with Sub-Clause 11.1 of the Contract.
            </p>
          </div>

          {/* Outstanding Work */}
          <div className="mb-5">
            <h3 className="text-[#1a5276] mb-2.5 text-[18px]">Outstanding Work and Defects</h3>
            <div className="border border-gray-300 rounded p-3 bg-white">
              <p className="whitespace-pre-wrap text-[14px]">{outstandingWork}</p>
            </div>
            <p className="text-[12px] text-muted-foreground mt-2">
              * The Contractor shall complete the outstanding work and remedy defects listed above during the Defects Notification Period.
            </p>
          </div>

          {/* Signatures Section */}
          <div className="border-t-2 border-gray-300 pt-6 mt-auto">
            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Engineer */}
              <div>
                <div className="mb-12 border-b-2 border-gray-400"></div>
                <div className="text-center text-[13px]">
                  <p>Engineer/Engineer's Representative</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Signature & Date</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">Name: _________________</p>
                </div>
              </div>

              {/* Contractor */}
              <div>
                <div className="mb-12 border-b-2 border-gray-400"></div>
                <div className="text-center text-[13px]">
                  <p>Contractor</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Signature & Date</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">Name: {displayProject?.contractor?.contact || "Contractor Contact"}</p>
                </div>
              </div>

              {/* Employer */}
              <div>
                <div className="mb-12 border-b-2 border-gray-400"></div>
                <div className="text-center text-[13px]">
                  <p>Employer/Employer's Representative</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Signature & Date</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">Name: {displayProject?.client?.contact || "Client Contact"}</p>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center text-[11px] text-muted-foreground border-t pt-3">
            </div>
          </div>
        </div>
      </div>

      {/* Edit Options (Print Hidden) */}
      <div className="max-w-[210mm] mx-auto mt-8 p-6 bg-white rounded-lg shadow print:hidden">
        <h3 className="text-[#1a5276] mb-4">Certificate Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">Certificate Number</label>
            <input
              type="text"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Certificate Date</label>
              <input
                type="date"
                value={certificateDate}
                onChange={(e) => setCertificateDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Taking Over Date</label>
              <input
                type="date"
                value={takingOverDate}
                onChange={(e) => setTakingOverDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block mb-2">Outstanding Work and Defects</label>
            <textarea
              value={outstandingWork}
              onChange={(e) => setOutstandingWork(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded min-h-[100px]"
              placeholder="List any outstanding work or defects..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
