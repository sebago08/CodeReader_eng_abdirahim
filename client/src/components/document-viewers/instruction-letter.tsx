import { ArrowLeft, Download, Save, CheckCircle2, AlertCircle } from 'lucide-react';
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

interface InstructionLetterProps {
  project: Project;
  documentId: string;
  savedData?: SavedDocumentData;
  onBack: () => void;
  onSave: (documentId: string, documentName: string, customContent?: any) => void;
}

export function InstructionLetter({ project, documentId, savedData, onBack, onSave }: InstructionLetterProps) {
  // Use saved data if available, otherwise use live project data
  const displayProject = savedData?.projectSnapshot || project;
  const isSaved = !!savedData;
  const [letterNumber, setLetterNumber] = useState(`IL-${project.number}-${new Date().getFullYear()}`);
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('instruction-letter-content');
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
      pdf.save(`Instruction_Letter_${project.number}_${letterDate}.pdf`);
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
      `Instruction Letter - ${project?.number || 'New'}`
    );
    if (documentName && documentName.trim()) {
      onSave(documentId, documentName.trim(), {
        letterNumber,
        letterDate,
        subject,
        letterContent
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
          <h1 className="text-[#1a5276]">Instruction Letter</h1>
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
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-[#1a5276] hover:bg-[#14455f]"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Letter Content - A4 Portrait (210mm x 297mm) */}
      <div className="bg-white w-[210mm] h-[297mm] mx-auto shadow-lg overflow-hidden" id="instruction-letter-content">
        <div className="p-12 print-container h-full flex flex-col">
          {/* Letterhead */}
          <div className="text-center border-b-4 border-[#1a5276] pb-4 mb-6">
            <div className="mb-3">
              <p className="text-center mb-4 text-[28px] font-bold">{displayProject?.client?.name || "Client Name"}</p>
              {displayProject?.client?.logo && (
                <div className="flex justify-center">
                  <img 
                    src={displayProject?.client?.logo} 
                    alt={`${displayProject?.client?.name || "Client Name"} logo`}
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
            </div>
            {displayProject?.client?.address && (
              <p className="text-[12px] text-muted-foreground mt-2">{displayProject?.client?.address}</p>
            )}
          </div>

          {/* Letter Header */}
          <div className="mb-6 text-[14px]">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-[13px]">Letter No:</p>
                <p className="text-[#1a5276]">{letterNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-[13px]">Date:</p>
                <p>{formatDate(letterDate)}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-muted-foreground text-[13px]">To:</p>
              <p>{displayProject?.contractor?.name || "Contractor Name"}</p>
              <p className="text-[13px]">Attn: {displayProject?.contractor?.contact || "Contractor Contact"}</p>
            </div>

            <div className="mb-4">
              <p className="text-muted-foreground text-[13px]">From:</p>
              <p>{displayProject?.client?.name || "Client Name"}</p>
              <p className="text-[13px]">Project Engineer: {displayProject?.client?.contact || "Client Contact"}</p>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <p className="text-[14px]">
              <strong>RE: {subject || '[SUBJECT LINE]'}</strong>
            </p>
            <p className="text-[14px]"><strong>Project: {displayProject.name}</strong></p>
          </div>

          {/* Letter Body */}
          <div className="mb-6 flex-grow text-[14px]">
            <div className="leading-relaxed whitespace-pre-wrap">
              {letterContent || 'Dear ' + displayProject?.contractor?.contact || "Contractor Contact" + ',\n\n[Enter your letter content here]\n\nSincerely,'}
            </div>
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-gray-300 pt-6 mt-auto">
            <div className="max-w-md">
              {/* Client/Employer Signature */}
              <div>
                <div className="mb-12 border-b-2 border-gray-400"></div>
                <div className="text-[13px]">
                  <p>{displayProject?.client?.contact || "Client Contact"}</p>
                  <p className="text-muted-foreground text-[12px] mt-1">{displayProject?.client?.name || "Client Name"}</p>
                  <p className="text-muted-foreground text-[11px] mt-1">Project Engineer - Signature & Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Options (Print Hidden) */}
      <div className="max-w-[210mm] mx-auto mt-8 p-6 bg-white rounded-lg shadow print:hidden">
        <h3 className="text-[#1a5276] mb-4">Letter Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">Letter Number</label>
            <input
              type="text"
              value={letterNumber}
              onChange={(e) => setLetterNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block mb-2">Letter Date</label>
            <input
              type="date"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., SITE INSTRUCTION - CONCRETE WORKS"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block mb-2">Letter Content</label>
            <textarea
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              placeholder={`Dear ${project?.contractor?.contact || 'Contractor Contact'},\n\n[Enter your letter content here]\n\nSincerely,`}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
