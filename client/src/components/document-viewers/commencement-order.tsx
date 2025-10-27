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
  client?: { name?: string; logo?: string; address?: string; contact?: string };
  contractor?: { name?: string; contact?: string };
}

interface SavedDocumentData {
  projectSnapshot?: any;
  customContent?: any;
  savedAt?: string;
}

interface CommencementOrderProps {
  project: Project;
  documentId: string;
  savedData?: SavedDocumentData;
  onBack: () => void;
  onSave: (documentId: string, documentName: string, customContent?: any) => void;
}

export function CommencementOrder({ project, documentId, savedData, onBack, onSave }: CommencementOrderProps) {
  // Use saved data if available, otherwise use live project data
  const displayProject = savedData?.projectSnapshot || project;
  const isSaved = !!savedData;
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [orderNumber, setOrderNumber] = useState(`CO-${project.number}-${new Date().getFullYear()}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [commencementDate, setCommencementDate] = useState(new Date().toISOString().split('T')[0]);
  const [completionDate, setCompletionDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    // Use the browser's native print dialog
    window.print();
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('commencement-content');
      if (!element) return;

      const certificateClone = element.cloneNode(true) as HTMLElement;
      
      certificateClone.style.backgroundColor = '#ffffff';
      certificateClone.style.color = '#000000';
      certificateClone.style.position = 'absolute';
      certificateClone.style.left = '-9999px';
      certificateClone.style.top = '0';
      
      document.body.appendChild(certificateClone);
      
      const allElements = certificateClone.querySelectorAll('*');
      allElements.forEach((el) => {
        const element = el as HTMLElement;
        
        try {
          const computedStyle = window.getComputedStyle(element);
          
          const styles: { [key: string]: string } = {};
          
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
          
          element.removeAttribute('class');
          
          Object.entries(styles).forEach(([prop, value]) => {
            (element.style as any)[prop] = value;
          });
        } catch (e) {
          element.removeAttribute('class');
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(certificateClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123
      });

      document.body.removeChild(certificateClone);

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Commencement_Order_${project.number}_${orderDate}.pdf`);
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
    setShowSaveDialog(true);
  };

  const handleConfirmSave = (documentName: string) => {
    onSave(documentId, documentName, {
      orderNumber,
      orderDate,
      commencementDate,
      completionDate
    });
  };

  // Get current document to use as default name
  const currentDocument = project.documents?.find(d => d.id === documentId);
  const defaultDocumentName = currentDocument?.name || `Commencement Order - ${project.number}`;

  return (
    <div>
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border print:hidden">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          <h1 className="text-[#1a5276]">Commencement Order</h1>
          {isSaved ? (
            <Badge className="bg-[#27ae60] text-white hover:bg-[#27ae60]">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Saved {new Date(savedData.savedAt).toLocaleDateString()}
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

      {/* Letter Content - A4 Portrait (210mm x 297mm) */}
      <div className="bg-white w-[210mm] h-[297mm] mx-auto shadow-lg overflow-hidden" id="commencement-content">
        <div className="p-12 print-container h-full flex flex-col">
          {/* Letterhead */}
          <div className="text-center border-b-4 border-[#1a5276] pb-4 mb-6">
            <div className="mb-3">
              <p className="text-center mb-4 text-[28px] font-bold">{displayProject.client.name}</p>
              {displayProject?.client?.logo && (
                <div className="flex justify-center">
                  <img 
                    src={displayProject.client.logo} 
                    alt={`${displayProject.client.name} logo`}
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
            </div>
            {displayProject.client.address && (
              <p className="text-[12px] text-muted-foreground mt-2">{displayProject.client.address}</p>
            )}
          </div>

          {/* Letter Header */}
          <div className="mb-6 text-[14px]">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-[13px]">Order No:</p>
                <p className="text-[#1a5276]">{orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-[13px]">Date:</p>
                <p>{formatDate(orderDate)}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-muted-foreground text-[13px]">To:</p>
              <p>{displayProject.contractor.name}</p>
              <p className="text-[13px]">Attn: {displayProject.contractor.contact}</p>
            </div>

            <div className="mb-4">
              <p className="text-muted-foreground text-[13px]">From:</p>
              <p>{displayProject.client.name}</p>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <p className="text-[14px] mb-2"><strong>RE: COMMENCEMENT ORDER</strong></p>
            <p className="text-[14px]"><strong>Project: {displayProject.name}</strong></p>
          </div>

          {/* Letter Body */}
          <div className="mb-6 flex-grow text-[14px] space-y-4">
            <p className="leading-relaxed">
              Dear {displayProject.contractor.contact},
            </p>

            <p className="leading-relaxed">
              This letter serves as an official Commencement Order for the above-referenced project in accordance with the terms and conditions of the Contract Agreement.
            </p>

            <p className="leading-relaxed">
              You are hereby instructed to commence work on the above project effective <strong>{formatDate(commencementDate)}</strong>. Please ensure that all necessary resources, personnel, and equipment are mobilized to the site and that work proceeds in accordance with the approved schedule and specifications.
            </p>

            <p className="leading-relaxed">
              All work shall be carried out in strict compliance with the Contract Documents, including drawings, specifications, and any supplementary instructions issued by the Engineer.
            </p>

            <p className="leading-relaxed">
              Should you have any questions or require clarification on any aspect of this order, please contact the undersigned immediately.
            </p>

            <p className="leading-relaxed mt-4">
              Sincerely,
            </p>
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-gray-300 pt-6 mt-auto">
            <div className="max-w-md">
              {/* Client/Employer Signature */}
              <div>
                <div className="mb-12 border-b-2 border-gray-400"></div>
                <div className="text-[13px]">
                  <p>{displayProject.client.contact}</p>
                  <p className="text-muted-foreground text-[12px] mt-1">{displayProject.client.name}</p>
                  <p className="text-muted-foreground text-[11px] mt-1">Signature & Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Options (Print Hidden) */}
      <div className="max-w-[210mm] mx-auto mt-8 p-6 bg-white rounded-lg shadow print:hidden">
        <h3 className="text-[#1a5276] mb-4">Order Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">Order Number</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block mb-2">Order Date</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Commencement Date</label>
              <input
                type="date"
                value={commencementDate}
                onChange={(e) => setCommencementDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Planned Completion Date (Optional)</label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Document Dialog */}
      <SaveDocumentDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleConfirmSave}
        defaultName={defaultDocumentName}
        documentType="commencement order"
      />
    </div>
  );
}
