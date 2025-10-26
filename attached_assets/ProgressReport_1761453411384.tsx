import { ArrowLeft, FileText, Calendar, MapPin, DollarSign, Building, HardHat, User, Mail, Phone, Download, Edit2, Save, X, Upload, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { Project, ProgressPhoto, SavedDocumentData } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { RichTextEditor } from './RichTextEditor';
import { SaveDocumentDialog } from './SaveDocumentDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Badge } from './ui/badge';

interface ProgressReportProps {
  project: Project;
  documentId: string;
  savedData?: SavedDocumentData;
  onBack: () => void;
  onUpdate?: (projectId: number, updates: Partial<Project>) => void;
  onSave: (documentId: string, documentName: string, customContent?: any) => void;
}

export function ProgressReport({ project, documentId, savedData, onBack, onUpdate, onSave }: ProgressReportProps) {
  // Use saved data if available, otherwise use live project data
  const displayProject = savedData?.projectSnapshot || project;
  const isSaved = !!savedData;
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isEditingIssues, setIsEditingIssues] = useState(false);
  const [editedIssues, setEditedIssues] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const reportPeriod = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getContractAmount = (): number => {
    // Parse contract amount from displayProject, removing currency symbols and commas
    const amount = displayProject.contractAmount?.replace(/[$,]/g, '') || '0';
    return parseFloat(amount) || 0;
  };

  const getAdvancePayment = (): number => {
    const amount = displayProject.advancePayment?.replace(/[$,]/g, '') || '0';
    return parseFloat(amount) || 0;
  };

  const getTotalCertified = (): number => {
    const certificatesTotal = displayProject.paymentCertificates?.reduce((sum, cert) => sum + cert.amount, 0) || 0;
    const advancePaymentAmount = getAdvancePayment();
    return certificatesTotal + advancePaymentAmount;
  };

  const handlePrint = () => {
    // Check if images are still uploading
    if (isUploadingImages) {
      toast.error('Please wait for images to finish uploading');
      return;
    }
    
    // Use the browser's native print dialog
    // This respects all the @media print styles in globals.css
    window.print();
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    // Check if images are still uploading
    if (isUploadingImages) {
      toast.error('Please wait for images to finish uploading');
      return;
    }
    
    setIsExporting(true);
    toast.info('Preparing report for PDF export...');

    try {
      // First, ensure all images in the current DOM are loaded
      const currentImages = Array.from(reportRef.current.querySelectorAll('img'));
      if (currentImages.length > 0) {
        toast.info(`Loading ${currentImages.length} image(s)...`);
        await Promise.all(
          currentImages.map((img) => {
            return new Promise<void>((resolve) => {
              if (img.complete && img.naturalHeight !== 0) {
                resolve();
              } else {
                const timeoutId = setTimeout(() => {
                  console.warn('Image load timeout:', img.src.substring(0, 50));
                  resolve();
                }, 10000); // 10 second timeout per image
                
                img.onload = () => {
                  clearTimeout(timeoutId);
                  resolve();
                };
                img.onerror = () => {
                  clearTimeout(timeoutId);
                  console.error('Image failed to load:', img.src.substring(0, 50));
                  resolve();
                };
              }
            });
          })
        );
        toast.info('Images loaded, generating PDF...');
      }
      // Create a clone of the report to modify for PDF
      const reportClone = reportRef.current.cloneNode(true) as HTMLElement;
      
      // Hide interactive elements in the clone
      const interactiveElements = reportClone.querySelectorAll('.print\\:hidden, button, input');
      interactiveElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // Apply PDF-specific styles
      reportClone.style.padding = '40px';
      reportClone.style.backgroundColor = '#ffffff';
      reportClone.style.width = '210mm';
      reportClone.style.position = 'absolute';
      reportClone.style.left = '-9999px';
      reportClone.style.top = '0';
      reportClone.style.color = '#000000'; // Force black text
      
      document.body.appendChild(reportClone);
      
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait for all images to load in the clone
      const images = Array.from(reportClone.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          return new Promise<void>((resolve, reject) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => {
                console.warn('Image failed to load:', img.src);
                resolve(); // Continue even if image fails
              };
              // Force reload if src is a data URL
              if (img.src.startsWith('data:')) {
                const src = img.src;
                img.src = '';
                img.src = src;
              }
            }
          });
        })
      );
      
      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // AGGRESSIVE FIX: Strip ALL classes and convert to inline styles
      // This completely eliminates Tailwind's oklab colors from the DOM
      const allElements = reportClone.querySelectorAll('*');
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
            'boxSizing', 'overflow', 'overflowX', 'overflowY'
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
            styles.borderColor = '#e5e7eb';
          }
          
          // Remove ALL class attributes (this is key!)
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

      // Check if we have a page break marker for Progress Photos
      const pageBreakElement = reportClone.querySelector('[data-pdf-page-break="true"]');
      
      let mainCanvas: HTMLCanvasElement;
      let photosCanvas: HTMLCanvasElement | null = null;
      
      if (pageBreakElement) {
        // Split the content into two parts
        toast.info('Capturing content (split at Progress Photos)...');
        
        // Create two clones - one for before photos, one for photos and after
        const beforePhotosClone = reportClone.cloneNode(true) as HTMLElement;
        const photosOnlyClone = reportClone.cloneNode(true) as HTMLElement;
        
        // In beforePhotosClone, hide the Progress Photos section AND all following siblings
        const beforeBreak = beforePhotosClone.querySelector('[data-pdf-page-break="true"]');
        if (beforeBreak) {
          // Hide the Progress Photos section
          (beforeBreak as HTMLElement).style.display = 'none';
          
          // Hide all following siblings
          let nextElement = beforeBreak.nextElementSibling;
          while (nextElement) {
            (nextElement as HTMLElement).style.display = 'none';
            nextElement = nextElement.nextElementSibling;
          }
        }
        
        // In photosOnlyClone, hide everything before Progress Photos
        const afterBreak = photosOnlyClone.querySelector('[data-pdf-page-break="true"]');
        if (afterBreak) {
          // Hide all previous siblings
          let currentElement = afterBreak.previousElementSibling;
          while (currentElement) {
            (currentElement as HTMLElement).style.display = 'none';
            currentElement = currentElement.previousElementSibling;
          }
        }
        
        document.body.appendChild(beforePhotosClone);
        document.body.appendChild(photosOnlyClone);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Render both canvases
        const oncloneCallback = (clonedDoc: Document) => {
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * { color-scheme: light !important; }
            body { color: #000000 !important; background-color: #ffffff !important; }
          `;
          clonedDoc.head.appendChild(style);
          const clonedImages = clonedDoc.querySelectorAll('img');
          clonedImages.forEach((img: HTMLImageElement) => {
            img.crossOrigin = 'anonymous';
          });
        };
        
        [mainCanvas, photosCanvas] = await Promise.all([
          html2canvas(beforePhotosClone, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 15000,
            onclone: oncloneCallback
          }),
          html2canvas(photosOnlyClone, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 15000,
            onclone: oncloneCallback
          })
        ]);
        
        document.body.removeChild(beforePhotosClone);
        document.body.removeChild(photosOnlyClone);
      } else {
        // No page break marker, render everything as one canvas
        toast.info('Capturing content...');
        
        mainCanvas = await html2canvas(reportClone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.textContent = `
              * { color-scheme: light !important; }
              body { color: #000000 !important; background-color: #ffffff !important; }
            `;
            clonedDoc.head.appendChild(style);
            const clonedImages = clonedDoc.querySelectorAll('img');
            clonedImages.forEach((img: HTMLImageElement) => {
              img.crossOrigin = 'anonymous';
            });
          }
        });
      }

      document.body.removeChild(reportClone);
      
      console.log('Canvas created:', mainCanvas.width, 'x', mainCanvas.height);
      if (photosCanvas) {
        console.log('Photos canvas created:', photosCanvas.width, 'x', photosCanvas.height);
      }
      toast.info('Creating PDF document...');

      // PDF dimensions (A4)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 20; // 20mm margin on all sides
      const contentWidth = pageWidth - (margin * 2);

      // Add main content
      const mainImgWidth = contentWidth;
      const mainImgHeight = (mainCanvas.height * mainImgWidth) / mainCanvas.width;
      let heightLeft = mainImgHeight;
      let position = 0;

      // Add first page with main content
      pdf.addImage(
        mainCanvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        mainImgWidth,
        mainImgHeight,
        undefined,
        'FAST'
      );

      heightLeft -= pageHeight;

      // Add additional pages for main content if needed
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(
          mainCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          position + margin,
          mainImgWidth,
          mainImgHeight,
          undefined,
          'FAST'
        );
        heightLeft -= pageHeight;
      }
      
      // Add Progress Photos on a new page if we have them
      if (photosCanvas) {
        pdf.addPage();
        
        const photosImgWidth = contentWidth;
        const photosImgHeight = (photosCanvas.height * photosImgWidth) / photosCanvas.width;
        let photosHeightLeft = photosImgHeight;
        let photosPosition = 0;
        
        // Add first page of photos
        pdf.addImage(
          photosCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          photosImgWidth,
          photosImgHeight,
          undefined,
          'FAST'
        );
        
        photosHeightLeft -= pageHeight;
        
        // Add additional pages for photos if needed
        while (photosHeightLeft > 0) {
          photosPosition -= pageHeight;
          pdf.addPage();
          pdf.addImage(
            photosCanvas.toDataURL('image/png'),
            'PNG',
            margin,
            photosPosition + margin,
            photosImgWidth,
            photosImgHeight,
            undefined,
            'FAST'
          );
          photosHeightLeft -= pageHeight;
        }
      }

      // Generate filename
      const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_Progress_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      pdf.save(fileName);
      
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to generate PDF. ';
      if (error instanceof Error) {
        if (error.message.includes('oklab') || error.message.includes('oklch')) {
          errorMessage = 'PDF export failed due to color format incompatibility. Please try using the browser\'s Print to PDF feature instead (Ctrl/Cmd + P).';
        } else if (error.message.includes('canvas')) {
          errorMessage += 'There was an issue rendering the content. Try removing some images or use Print to PDF.';
        } else if (error.message.includes('image')) {
          errorMessage += 'There was an issue processing images. Ensure all images are properly loaded.';
        } else {
          errorMessage += error.message + '. You can also try using Print to PDF (Ctrl/Cmd + P) as an alternative.';
        }
      } else {
        errorMessage += 'Please try using Print to PDF (Ctrl/Cmd + P) instead.';
      }
      
      toast.error(errorMessage, {
        duration: 8000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditIssues = () => {
    // Convert Issue objects to HTML list
    const issuesHtml = project.issuesAndConcerns && project.issuesAndConcerns.length > 0
      ? '<ul>' + project.issuesAndConcerns.map(issue => `<li>${typeof issue === 'string' ? issue : issue.description}</li>`).join('') + '</ul>'
      : '';
    setEditedIssues(issuesHtml);
    setIsEditingIssues(true);
  };

  const handleSaveIssues = () => {
    if (onUpdate) {
      // Parse HTML to extract text items for the array
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editedIssues;
      const listItems = Array.from(tempDiv.querySelectorAll('li')).map(li => li.textContent || '');
      const issuesTexts = listItems.length > 0 ? listItems : [editedIssues.replace(/<[^>]*>/g, '').trim()].filter(Boolean);
      
      // Convert text back to Issue objects, preserving existing issue properties where possible
      const issuesArray = issuesTexts.map((text, index) => {
        // Try to find matching existing issue by description
        const existing = project.issuesAndConcerns?.find(
          issue => (typeof issue === 'string' ? issue : issue.description) === text
        );
        
        if (existing && typeof existing !== 'string') {
          return existing;
        }
        
        // Create new issue if it doesn't exist
        return {
          id: `issue-${Date.now()}-${index}`,
          description: text,
          status: 'outstanding' as const,
          dateCaptured: new Date().toISOString().split('T')[0],
        };
      });
      
      onUpdate(project.id, { issuesAndConcerns: issuesArray });
    }
    setIsEditingIssues(false);
  };

  const handleCancelEdit = () => {
    setIsEditingIssues(false);
    setEditedIssues('');
  };

  // Helper function to compress image
  const compressImage = (dataUrl: string, maxWidth = 1200, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl); // Fallback to original
        }
      };
      img.onerror = () => resolve(dataUrl); // Fallback to original
      img.src = dataUrl;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgress(0);
    toast.info('Processing images...');

    const newPhotos: ProgressPhoto[] = [];
    
    // Convert files to base64 and compress
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update progress
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Check file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB`);
        continue;
      }

      try {
        // Read file as data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Compress the image for better performance
        const compressedDataUrl = await compressImage(dataUrl);

        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          dataUrl: compressedDataUrl,
          fileName: file.name,
          uploadedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newPhotos.length > 0 && onUpdate) {
      const existingPhotos = project.progressPhotos || [];
      onUpdate(project.id, { 
        progressPhotos: [...existingPhotos, ...newPhotos] 
      });
      
      // Wait a bit to ensure state has updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(`${newPhotos.length} photo(s) uploaded successfully`);
    }

    setIsUploadingImages(false);
    setUploadProgress(0);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (onUpdate && project.progressPhotos) {
      const updatedPhotos = project.progressPhotos.filter(p => p.id !== photoId);
      onUpdate(project.id, { progressPhotos: updatedPhotos });
      toast.success('Photo deleted');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveDocument = () => {
    setShowSaveDialog(true);
  };

  const handleConfirmSave = (documentName: string) => {
    onSave(documentId, documentName);
  };

  // Get current document to use as default name
  const currentDocument = project.documents?.find(d => d.id === documentId);
  const defaultDocumentName = currentDocument?.name || `Progress Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  return (
    <div>
      {/* Header with Actions - Hidden in Print */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border print:hidden">
        <div className="flex items-center gap-4">
          <h1 className="text-[#1a5276]">Monthly Progress Report</h1>
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
            className="bg-[#1a5276] hover:bg-[#1a5276]/90 text-white"
            disabled={isUploadingImages}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
          <Button 
            onClick={handleExportPDF} 
            variant="secondary"
            disabled={isExporting || isUploadingImages}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : isUploadingImages ? 'Processing Images...' : 'Export PDF'}
          </Button>
          <Button onClick={onBack} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
        </div>
      </div>

      {/* Cover Image Upload Section - Hidden in Print */}
      {!isSaved && (
        <Card className="mb-6 print:hidden">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3498db]/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-[#3498db]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[#1a5276] mb-1">Cover Page Image</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a single image to display on the cover page (e.g., project site photo)
                  </p>
                </div>
              </div>

              {displayProject.coverImage ? (
                <div className="space-y-3">
                  <div className="relative inline-block w-full">
                    <img 
                      src={displayProject.coverImage} 
                      alt="Cover" 
                      className="w-full max-h-80 object-cover rounded-lg border-2 border-border shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-3 right-3"
                      onClick={() => {
                        if (onUpdate) {
                          onUpdate(project.id, { coverImage: '' });
                          toast.success('Cover image removed');
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cover image uploaded successfully. This will appear on the cover page of this report.
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#3498db]/30 bg-[#3498db]/5 rounded-lg p-12 text-center hover:border-[#3498db]/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (onUpdate) {
                            onUpdate(project.id, { coverImage: reader.result as string });
                            toast.success('Cover image uploaded');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="cover-image-upload-report"
                  />
                  <label htmlFor="cover-image-upload-report" className="cursor-pointer block">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-[#3498db]/10 flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-[#3498db]" />
                      </div>
                      <p className="text-[#1a5276] mb-1">Click to upload cover image</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, JPEG up to 10MB</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-8 md:p-12 print:!p-0" ref={reportRef}>
          {/* Cover Page */}
          <div className="flex flex-col items-center justify-start pt-16 px-12 pb-12 print:pt-12 print:px-8 print:pb-8 print:mb-0 print:min-h-[257mm]" style={{ pageBreakAfter: 'always' }}>
            {/* Content Container */}
            <div className="w-full max-w-4xl flex flex-col items-center text-center space-y-6">
              {/* Client Logo */}
              {displayProject.client.logo && (
                <div className="mb-4">
                  <ImageWithFallback 
                    src={displayProject.client.logo} 
                    alt={displayProject.client.name}
                    className="max-w-[180px] max-h-[180px] object-contain"
                  />
                </div>
              )}

              {/* Municipality/Client Name */}
              <div className="space-y-1">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {displayProject.client.name}
                </h3>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {displayProject.name}
                </h3>
              </div>

              {/* Project Details - Highlighted Section */}
              <div className="bg-yellow-300 px-8 py-6 mt-6 space-y-2 w-full">
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {displayProject.name}
                </p>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  Contract: {displayProject.number}
                </p>
                <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  Contractor: {displayProject.contractor.name}
                </p>
              </div>

              {/* Report Title */}
              <div className="mt-8">
                <h1 className="text-[#3498db]" style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  MONTHLY PROGRESS REPORT {reportPeriod.toUpperCase()}
                </h1>
              </div>

              {/* Logos and Date Section */}
              <div className="flex items-center justify-between w-full px-4 mt-8">
                <div className="flex-1 flex justify-start">
                  {/* Placeholder for additional logo - you can add logo fields to client if needed */}
                  <div className="text-left">
                  </div>
                </div>
                <div className="flex-1 flex justify-end">
                  <div className="text-right">
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              {displayProject.coverImage && (
                <div className="-mt-6 w-full flex justify-center">
                  <div className="w-full h-64 print:w-[90%] print:h-[190px] overflow-hidden rounded-lg border-2 border-gray-300">
                    <ImageWithFallback 
                      src={displayProject.coverImage} 
                      alt="Project Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Print Container - Wraps all content pages (except cover) with consistent padding */}
          <div className="print-container">

          {/* Table of Contents */}
          <div className="mb-8 print-section page-break-before" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
            <h2 className="text-[#1a5276] mb-8 pb-3 border-b-2 border-[#1a5276] text-center" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              TABLE OF CONTENTS
            </h2>
            
            <div className="space-y-3 mt-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
              {/* Section 1 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">1.</span>
                  <span>INTRODUCTION</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pl-8">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">1.1</span>
                  <span>Project Summary</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pl-8">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">1.2</span>
                  <span>Location and Extents of Works</span>
                </div>
              </div>

              {/* Section 2 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">2.</span>
                  <span>PROJECT INFORMATION</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pl-8">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">2.1</span>
                  <span>Project Summary</span>
                </div>
              </div>

              {/* Section 3 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">3.</span>
                  <span>SCOPE OF WORK</span>
                </div>
              </div>

              {/* Section 4 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">4.</span>
                  <span>PROGRESS</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pl-8">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">4.1</span>
                  <span>Overall Progress</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pl-8">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">4.2</span>
                  <span>Work Progress</span>
                </div>
              </div>
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pl-8">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">4.3</span>
                  <span>Financial Progress</span>
                </div>
              </div>

              {/* Section 5 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">5.</span>
                  <span>WORK PLAN</span>
                </div>
              </div>

              {/* Section 6 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">6.</span>
                  <span>PROGRESS PHOTOS</span>
                </div>
              </div>

              {/* Section 7 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">7.</span>
                  <span>CLIENT PERSONNEL</span>
                </div>
              </div>

              {/* Section 8 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">8.</span>
                  <span>CONTRACTOR PERSONNEL</span>
                </div>
              </div>

              {/* Section 9 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">9.</span>
                  <span>CONTRACTOR'S EQUIPMENT</span>
                </div>
              </div>

              {/* Section 10 */}
              <div className="flex justify-between items-baseline border-b border-dashed border-gray-300 pb-2 pt-2">
                <div className="flex gap-3">
                  <span className="text-[#1a5276]">10.</span>
                  <span>ISSUES AND CONCERNS</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Introduction Section */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">
              1. INTRODUCTION
            </h2>
            
            {/* Executive Summary */}
            <div className="mb-8 print-section">
              <h3 className="mb-4">1.1 Project Summary</h3>
              {displayProject.executiveSummary ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: displayProject.executiveSummary }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  No executive summary has been provided for this project. You can add one in the project form under "Report Content" tab.
                </p>
              )}
            </div>

            {/* Location and Extents of Works */}
            <div className="mb-8 print-section">
              <h3 className="mb-4">1.2 Location and Extents of Works</h3>
              {displayProject.locationAndExtent ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: displayProject.locationAndExtent }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  No location and extents information has been provided for this project. You can add it in the project form under "Report Content" tab.
                </p>
              )}
            </div>
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Project Information */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">
              2. PROJECT INFORMATION
            </h2>
            <h3 className="text-[#1a5276] mb-2">
              2.1 Project Summary - {displayProject.number}
            </h3>
            <p className="mb-6 italic">Table 1: Project Summary</p>
            
            <div className="border border-black overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="text-center p-3 border-r border-black" style={{ width: '60px' }}></th>
                    <th className="text-left p-3 border-r border-black">Item</th>
                    <th className="text-left p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">1.</td>
                    <td className="p-3 border-r border-black">Contractor</td>
                    <td className="p-3">{displayProject.contractor.name}</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">2.</td>
                    <td className="p-3 border-r border-black">Contract Sum (USD)</td>
                    <td className="p-3">{displayProject.contractAmount}</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">3.</td>
                    <td className="p-3 border-r border-black">Source of funds</td>
                    <td className="p-3">{displayProject.client.name}</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">4.</td>
                    <td className="p-3 border-r border-black">Date of Letter of Acceptance</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">5.</td>
                    <td className="p-3 border-r border-black">Date of Contract Signature</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">6.</td>
                    <td className="p-3 border-r border-black">Start Date</td>
                    <td className="p-3">{formatDate(displayProject.startDate)}</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">7.</td>
                    <td className="p-3 border-r border-black">Commencement date</td>
                    <td className="p-3">{formatDate(displayProject.startDate)}</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">8.</td>
                    <td className="p-3 border-r border-black">Original Contract period</td>
                    <td className="p-3">
                      {displayProject.plannedActivities && displayProject.plannedActivities.length > 0
                        ? `${Math.round(displayProject.plannedActivities.reduce((sum, act) => sum + act.duration, 0) / 30)} Months`
                        : '-'}
                    </td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">9.</td>
                    <td className="p-3 border-r border-black">Revised Contract period</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">10.</td>
                    <td className="p-3 border-r border-black">Site possession date</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">11.</td>
                    <td className="p-3 border-r border-black">Date of Completion</td>
                    <td className="p-3">
                      {displayProject.expectedCompletionDate
                        ? formatDate(displayProject.expectedCompletionDate)
                        : '-'}
                    </td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">12.</td>
                    <td className="p-3 border-r border-black">Period Elapsed</td>
                    <td className="p-3">
                      {Math.round(Math.floor((new Date().getTime() - new Date(displayProject.startDate).getTime()) / (1000 * 60 * 60 * 24)) / 30)} Months
                    </td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">13.</td>
                    <td className="p-3 border-r border-black">Percentage of Time Elapsed</td>
                    <td className="p-3">
                      {displayProject.plannedActivities && displayProject.plannedActivities.length > 0
                        ? `${Math.min(100, Math.round((Math.floor((new Date().getTime() - new Date(displayProject.startDate).getTime()) / (1000 * 60 * 60 * 24)) / displayProject.plannedActivities.reduce((sum, act) => sum + act.duration, 0)) * 100))}%`
                        : '-'}
                    </td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">14.</td>
                    <td className="p-3 border-r border-black">Percentage of Actual Work Progress for the month</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">15.</td>
                    <td className="p-3 border-r border-black">Percentage of Planned Work Progress of the month</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">16.</td>
                    <td className="p-3 border-r border-black">Physical progress to date</td>
                    <td className="p-3">{displayProject.progress}%</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">17.</td>
                    <td className="p-3 border-r border-black">Defects Liability Period</td>
                    <td className="p-3">{displayProject.defectsLiabilityPeriod || '-'}</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">18.</td>
                    <td className="p-3 border-r border-black">Claims</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">19.</td>
                    <td className="p-3 border-r border-black">Interest on Delayed Payments</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">20.</td>
                    <td className="p-3 border-r border-black">Liquidated Damages</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">21.</td>
                    <td className="p-3 border-r border-black">Total Amount certified to date (IPC01)</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">22.</td>
                    <td className="p-3 border-r border-black">Advance Payment</td>
                    <td className="p-3">${getAdvancePayment().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">23.</td>
                    <td className="p-3 border-r border-black">Percentage of amount certified to date (including Advance Payment and Retention Amount)</td>
                    <td className="p-3">-</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="text-center p-3 border-r border-black">24.</td>
                    <td className="p-3 border-r border-black">Amount paid to date</td>
                    <td className="p-3">${getTotalCertified().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Scope of Work */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">3. SCOPE OF WORK</h2>
            <div 
              className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1"
              style={{ lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ __html: project.scope }}
            />
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Progress Section */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">4. PROGRESS</h2>
            
            <h3 className="text-[#1a5276] mb-4">4.1 Overall Progress</h3>
            <div className="space-y-4" style={{ padding: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
              <div>
                <div className="flex justify-between mb-2">
                  <span>Completion Status</span>
                  <span className="text-[#1a5276]">{displayProject.progress}%</span>
                </div>
                <Progress value={displayProject.progress} className="h-3" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Card className="bg-[#3498db]/10 border-[#3498db]/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Days Elapsed</p>
                    <p className="text-[#3498db] mt-1">
                      {(() => {
                        const daysElapsed = Math.floor((new Date().getTime() - new Date(displayProject.startDate).getTime()) / (1000 * 60 * 60 * 24));
                        
                        // Calculate total project duration from expectedCompletionDate if available
                        let totalDuration = 0;
                        if (displayProject.expectedCompletionDate) {
                          const startDate = new Date(displayProject.startDate);
                          const endDate = new Date(displayProject.expectedCompletionDate);
                          totalDuration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        } else if (displayProject.plannedActivities && displayProject.plannedActivities.length > 0) {
                          // Fallback to planned activities if expectedCompletionDate not set
                          const startDate = new Date(displayProject.startDate);
                          const latestEndDate = new Date(
                            Math.max(...displayProject.plannedActivities.map(a => new Date(a.endDate).getTime()))
                          );
                          totalDuration = Math.floor((latestEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        }
                        
                        const timeElapsedPercent = totalDuration > 0 ? Math.round((daysElapsed / totalDuration) * 100) : 0;
                        
                        return `${timeElapsedPercent}% - ${daysElapsed} / ${totalDuration} days`;
                      })()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#f39c12]/10 border-[#f39c12]/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Budget Used</p>
                    <p className="text-[#f39c12] mt-1">
                      {displayProject.progress}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Work Progress */}
          <div className="mb-8 print-section mt-8">
            <h3 className="text-[#1a5276] mb-4">4.2 Work Progress</h3>
            {displayProject.plannedActivities && displayProject.plannedActivities.length > 0 ? (
              <div className="border border-black overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#1a5276]/10">
                    <tr>
                      <th className="text-left p-3 border-r border-black">Activity Name</th>
                      <th className="text-left p-3">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProject.plannedActivities.map((activity) => {
                      const tracking = displayProject.progressTracking?.find(p => p.activityId === activity.id);
                      const progress = tracking?.progress || 0;
                      return (
                        <tr key={activity.id} className="border-t border-black">
                          <td className="p-3 border-r border-black">{activity.name}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-[#27ae60] h-2 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm">{progress}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No planned activities scheduled for this project.</p>
            )}
          </div>

          {/* Financial Progress */}
          <div className="mb-8 print-section mt-8">
            <h3 className="text-[#1a5276] mb-4">4.3 Financial Progress</h3>
            
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Contract Amount</p>
                <p className="text-xl">${getContractAmount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Certified</p>
                <p className="text-xl">${getTotalCertified().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Balance</p>
                <p className="text-xl text-[#27ae60]">${(getContractAmount() - getTotalCertified()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-muted-foreground">Financial Progress</p>
                  <p className="text-sm">{getContractAmount() > 0 ? Math.round((getTotalCertified() / getContractAmount()) * 100 * 10) / 10 : 0}%</p>
                </div>
                <Progress value={getContractAmount() > 0 ? (getTotalCertified() / getContractAmount()) * 100 : 0} className="h-2 [&>div]:bg-[#3498db]" />
              </div>
            </div>

            {(displayProject.paymentCertificates && displayProject.paymentCertificates.length > 0) || (displayProject.advancePayment && parseFloat(displayProject.advancePayment) > 0) ? (
              <div className="border border-black overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-left p-3 border-r border-black">Certificate No.</th>
                      <th className="text-left p-3 border-r border-black">Amount (USD)</th>
                      <th className="text-left p-3 border-r border-black">Date certified</th>
                      <th className="text-left p-3">Payment Date/Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Advance Payment Row */}
                    {displayProject.advancePayment && parseFloat(displayProject.advancePayment) > 0 && (
                      <tr className="border-t border-black bg-blue-50">
                        <td className="p-3 border-r border-black">
                          <strong>Advance Payment</strong>
                        </td>
                        <td className="p-3 border-r border-black">
                          <strong>${getAdvancePayment().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </td>
                        <td className="p-3 border-r border-black">-</td>
                        <td className="p-3">-</td>
                      </tr>
                    )}
                    
                    {/* Payment Certificates */}
                    {displayProject.paymentCertificates?.map((cert) => (
                      <tr key={cert.id} className="border-t border-black">
                        <td className="p-3 border-r border-black">{cert.certificateNo}</td>
                        <td className="p-3 border-r border-black">
                          ${cert.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 border-r border-black">
                          {cert.dateCertified ? formatDate(cert.dateCertified) : '-'}
                        </td>
                        <td className="p-3">{cert.paymentDateStatus || '-'}</td>
                      </tr>
                    ))}
                    
                    <tr className="border-t border-black bg-gray-100">
                      <td className="p-3 border-r border-black">
                        <strong>Total</strong>
                      </td>
                      <td className="p-3 border-r border-black">
                        <strong>
                          ${getTotalCertified().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td className="p-3 border-r border-black" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No payment certificates recorded for this project.</p>
            )}
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Work Plan */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">5. WORK PLAN</h2>
            {displayProject.plannedActivities && displayProject.plannedActivities.length > 0 ? (
              <div className="border border-black overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#1a5276]/10">
                    <tr>
                      <th className="text-left p-3 border-r border-black">Activity Name</th>
                      <th className="text-left p-3 border-r border-black">Start Date</th>
                      <th className="text-left p-3 border-r border-black">Duration</th>
                      <th className="text-left p-3">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProject.plannedActivities.map((activity) => (
                      <tr key={activity.id} className="border-t border-black">
                        <td className="p-3 border-r border-black">{activity.name}</td>
                        <td className="p-3 border-r border-black">{formatDate(activity.startDate)}</td>
                        <td className="p-3 border-r border-black">{activity.duration} days</td>
                        <td className="p-3">{formatDate(activity.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No planned activities scheduled for this project.</p>
            )}
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Progress Photos - Always start on new page */}
          <div className="mb-8 print-section page-break-before" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[#1a5276] flex items-center gap-2 pb-2 border-b border-[#1a5276] w-full">
                <ImageIcon className="w-5 h-5" />
                6. PROGRESS PHOTOS
              </h2>
              {onUpdate && !isSaved && (
                <Button 
                  onClick={handleUploadClick} 
                  variant="outline" 
                  size="sm"
                  className="print:hidden"
                  disabled={isUploadingImages}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingImages ? 'Uploading...' : 'Upload Photos'}
                </Button>
              )}
            </div>

            {/* Upload Progress Indicator */}
            {isUploadingImages && (
              <div className="mb-4 p-4 bg-[#3498db]/10 border border-[#3498db]/20 rounded-lg print:hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Processing images...</span>
                  <span className="text-sm text-[#3498db]">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploadingImages}
            />

            {displayProject.progressPhotos && displayProject.progressPhotos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
                {displayProject.progressPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="relative group border rounded-lg overflow-hidden bg-muted/30"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.fileName}
                      className="w-full h-64 object-cover"
                      crossOrigin="anonymous"
                      loading="eager"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm truncate">{photo.fileName}</p>
                      <p className="text-white/70 text-xs">
                        {new Date(photo.uploadedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    {onUpdate && (
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No progress photos uploaded yet</p>
                {onUpdate && (
                  <Button onClick={handleUploadClick} variant="outline" className="print:hidden">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your First Photo
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Client Personnel Section */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">
              7. CLIENT PERSONNEL
            </h2>
            <p className="mb-4 italic">Table 2: Client Personnel</p>
            
            {displayProject.client.personnel && displayProject.client.personnel.length > 0 ? (
              <div className="border border-black overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-center p-3 border-r border-black" style={{ width: '60px' }}>#</th>
                      <th className="text-left p-3 border-r border-black">Name</th>
                      <th className="text-left p-3 border-r border-black">Qualification</th>
                      <th className="text-left p-3">Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProject.client.personnel.map((person, index) => (
                      <tr key={person.id} className="border-t border-black">
                        <td className="text-center p-3 border-r border-black">{index + 1}.</td>
                        <td className="p-3 border-r border-black">{person.name}</td>
                        <td className="p-3 border-r border-black">{person.qualification}</td>
                        <td className="p-3">{person.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No client personnel records available.</p>
              </div>
            )}
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Contractor Personnel Section */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">
              8. CONTRACTOR PERSONNEL
            </h2>
            <p className="mb-4 italic">Table 3: Contractor Personnel</p>
            
            {displayProject.contractor.personnel && displayProject.contractor.personnel.length > 0 ? (
              <div className="border border-black overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-center p-3 border-r border-black" style={{ width: '60px' }}>#</th>
                      <th className="text-left p-3 border-r border-black">Name</th>
                      <th className="text-left p-3 border-r border-black">Qualification</th>
                      <th className="text-left p-3">Designation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProject.contractor.personnel.map((person, index) => (
                      <tr key={person.id} className="border-t border-black">
                        <td className="text-center p-3 border-r border-black">{index + 1}.</td>
                        <td className="p-3 border-r border-black">{person.name}</td>
                        <td className="p-3 border-r border-black">{person.qualification}</td>
                        <td className="p-3">{person.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No contractor personnel records available.</p>
              </div>
            )}
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Contractor's Equipment Section */}
          <div className="mb-8 print-section">
            <h2 className="text-[#1a5276] mb-6 pb-2 border-b border-[#1a5276]">
              9. CONTRACTOR'S EQUIPMENT
            </h2>
            <p className="mb-4 italic">Table 4: Contractor's Equipment</p>
            
            {displayProject.contractor.equipment && displayProject.contractor.equipment.length > 0 ? (
              <div className="border border-black overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-center p-3 border-r border-black" style={{ width: '60px' }}>#</th>
                      <th className="text-left p-3 border-r border-black">Equipment Name</th>
                      <th className="text-left p-3 border-r border-black">Type</th>
                      <th className="text-center p-3 border-r border-black">Quantity</th>
                      <th className="text-left p-3">Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProject.contractor.equipment.map((equipment, index) => (
                      <tr key={equipment.id} className="border-t border-black">
                        <td className="text-center p-3 border-r border-black">{index + 1}.</td>
                        <td className="p-3 border-r border-black">{equipment.name}</td>
                        <td className="p-3 border-r border-black">{equipment.type}</td>
                        <td className="text-center p-3 border-r border-black">{equipment.quantity}</td>
                        <td className="p-3">{equipment.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No contractor equipment records available.</p>
              </div>
            )}
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Issues and Concerns - Editable Section */}
          <div className="mb-8 print-section">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[#1a5276] pb-2 border-b border-[#1a5276] w-full">10. ISSUES AND CONCERNS</h2>
            </div>
            
            {isEditingIssues ? (
              <div className="space-y-4 print:hidden">
                <RichTextEditor
                  value={editedIssues}
                  onChange={setEditedIssues}
                  placeholder="Enter issues and concerns. Use toolbar to add bullet points or numbered lists."
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveIssues} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fffbf5' }}>
                {project.issuesAndConcerns && project.issuesAndConcerns.length > 0 ? (
                  <div className="space-y-3">
                    {project.issuesAndConcerns.map((issue) => (
                      <div key={issue.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#f39c12] mt-2 flex-shrink-0" />
                        <div className="flex-1">
                          <p>{issue.description}</p>
                          {issue.status === 'resolved' && (
                            <p className="text-sm text-[#27ae60] mt-1">
                              ✓ Resolved {issue.resolvedDate ? `on ${issue.resolvedDate}` : ''}
                              {issue.resolutionNotes && ` - ${issue.resolutionNotes}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No issues or concerns recorded for this period.</p>
                )}
              </div>
            )}
          </div>

          <Separator className="my-8 print:hidden" />

          {/* Signatures */}
          <div className="mt-12 pt-8 print-section">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <p className="mb-8">Prepared by:</p>
                <div className="border-t border-border pt-2">
                  <p>John Smith</p>
                  <p className="text-sm text-muted-foreground">Project Manager</p>
                  <p className="text-sm text-muted-foreground">{currentDate}</p>
                </div>
              </div>
              <div>
                <p className="mb-8">Reviewed by:</p>
                <div className="border-t border-border pt-2">
                  <p>{project.client.contact}</p>
                  <p className="text-sm text-muted-foreground">{project.client.name}</p>
                  <p className="text-sm text-muted-foreground">_________________</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground print-section">
            <p>This report is confidential and intended solely for the use of {project.client.name}</p>
            <p className="mt-1">ConstructPro Project Management System - {currentDate}</p>
          </div>
          </div>{/* End print-container */}
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
        }
      `}</style>

      {/* Save Document Dialog */}
      <SaveDocumentDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleConfirmSave}
        defaultName={defaultDocumentName}
        documentType="progress report"
      />
    </div>
  );
}
