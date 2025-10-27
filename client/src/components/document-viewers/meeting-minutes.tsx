import { ArrowLeft, Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Type definitions
interface Project {
  id?: string;
  number?: string;
  name?: string;
}

interface SavedDocumentData {
  projectSnapshot?: any;
  customContent?: any;
  savedAt?: string;
}

interface MeetingMinutesProps {
  project: Project;
  documentId: string;
  savedData?: SavedDocumentData;
  onBack: () => void;
  onSave: (documentId: string, documentName: string, customContent?: any) => void;
}

export function MeetingMinutes({ project, documentId, savedData, onBack, onSave }: MeetingMinutesProps) {
  const displayProject = savedData?.projectSnapshot || project;
  const isSaved = !!savedData;
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [attendees, setAttendees] = useState('');
  const [agenda, setAgenda] = useState('');
  const [discussions, setDiscussions] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [nextMeeting, setNextMeeting] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('meeting-minutes-content');
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
          
        } catch (styleError) {
          console.warn('Error processing element styles:', styleError);
        }
      });

      const canvas = await html2canvas(certificateClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
      });

      document.body.removeChild(certificateClone);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Meeting_Minutes_${project.number}_${new Date(meetingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveDocument = () => {
    const documentName = window.prompt(
      'Enter document name:',
      `Meeting Minutes - ${new Date(meetingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    );
    if (documentName && documentName.trim()) {
      const customContent = {
        meetingDate,
        meetingTime,
        venue,
        attendees,
        agenda,
        discussions,
        actionItems,
        nextMeeting
      };
      onSave(documentId, documentName.trim(), customContent);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <div className="bg-white border-b border-border p-6 print:hidden">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button onClick={onBack} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-[#1a5276]">Meeting Minutes</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {displayProject.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSaved && (
                <Badge variant="secondary" className="bg-[#27ae60]/10 text-[#27ae60]">
                  Saved {savedData?.savedAt ? new Date(savedData.savedAt).toLocaleDateString() : ''}
                </Badge>
              )}
              <Button 
                onClick={handleSaveDocument} 
                variant="outline"
                disabled={isExporting}
                data-testid="button-save-document"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Document
              </Button>
              <Button 
                onClick={handlePrint}
                className="bg-[#1a5276] hover:bg-[#1a5276]/90"
                data-testid="button-print-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Form */}
      <div className="max-w-[1200px] mx-auto p-6 print:hidden">
        <div className="bg-white rounded-lg border border-border p-6 mb-6">
          <h2 className="text-[#1a5276] mb-4">Meeting Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="meeting-date">Meeting Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="meeting-time">Meeting Time</Label>
              <Input
                id="meeting-time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Project Site Office, Conference Room"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="attendees">Attendees</Label>
            <Textarea
              id="attendees"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="List all attendees (one per line or comma-separated)"
              className="min-h-[100px]"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="List meeting agenda items"
              className="min-h-[100px]"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="discussions">Discussions & Decisions</Label>
            <Textarea
              id="discussions"
              value={discussions}
              onChange={(e) => setDiscussions(e.target.value)}
              placeholder="Describe the key discussions and decisions made"
              className="min-h-[150px]"
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="action-items">Action Items</Label>
            <Textarea
              id="action-items"
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="List action items with responsible parties and deadlines"
              className="min-h-[120px]"
            />
          </div>
          <div>
            <Label htmlFor="next-meeting">Next Meeting</Label>
            <Input
              id="next-meeting"
              value={nextMeeting}
              onChange={(e) => setNextMeeting(e.target.value)}
              placeholder="e.g., October 15, 2025 at 10:00 AM"
            />
          </div>
        </div>
      </div>

      {/* Document Preview */}
      <div className="max-w-[1200px] mx-auto p-6 print:!p-0 print:!max-w-full print-content">
        <div id="meeting-minutes-content" className="bg-white rounded-lg border border-border p-12 print:!border-0 print:!rounded-none print:!p-8">
          {/* Letterhead */}
          <div className="text-center border-b-4 border-[#1a5276] pb-4 mb-6">
            <div className="mb-3">
              <p className="text-center mb-4 text-[28px] font-bold">{displayProject?.client?.name || 'Client Name'}</p>
              {displayProject?.client?.logo && (
                <div className="flex justify-center">
                  <img 
                    src={displayProject.client.logo} 
                    alt={`${displayProject?.client?.name || 'Client'} logo`}
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
            </div>
            {displayProject?.client?.address && (
              <p className="text-[12px] text-muted-foreground mt-2">{displayProject.client.address}</p>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-2 border-[#1a5276]">
            <h1 className="text-[#1a5276] mb-2">MEETING MINUTES</h1>
            <p className="text-[#1a5276]">{displayProject.name}</p>
            <p className="text-muted-foreground mt-1">Project No: {displayProject.number}</p>
          </div>

          {/* Meeting Details */}
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date:</p>
                <p>{new Date(meetingDate).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time:</p>
                <p>{meetingTime}</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">Venue:</p>
              <p>{venue || 'Not specified'}</p>
            </div>
          </div>

          {/* Attendees */}
          <div className="mb-6">
            <h3 className="text-[#1a5276] mb-3 pb-2 border-b border-border">Attendees</h3>
            <div className="whitespace-pre-wrap">{attendees || 'Not specified'}</div>
          </div>

          {/* Agenda */}
          <div className="mb-6">
            <h3 className="text-[#1a5276] mb-3 pb-2 border-b border-border">Agenda</h3>
            <div className="whitespace-pre-wrap">{agenda || 'Not specified'}</div>
          </div>

          {/* Discussions */}
          <div className="mb-6">
            <h3 className="text-[#1a5276] mb-3 pb-2 border-b border-border">Discussions & Decisions</h3>
            <div className="whitespace-pre-wrap">{discussions || 'Not specified'}</div>
          </div>

          {/* Action Items */}
          <div className="mb-6">
            <h3 className="text-[#1a5276] mb-3 pb-2 border-b border-border">Action Items</h3>
            <div className="whitespace-pre-wrap">{actionItems || 'Not specified'}</div>
          </div>

          {/* Next Meeting */}
          {nextMeeting && (
            <div className="mb-6">
              <h3 className="text-[#1a5276] mb-3 pb-2 border-b border-border">Next Meeting</h3>
              <p>{nextMeeting}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-border">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="mb-8">Prepared by:</p>
                <div className="border-t border-gray-400 pt-2">
                  <p className="text-sm text-muted-foreground">Name & Signature</p>
                </div>
              </div>
              <div>
                <p className="mb-8">Date:</p>
                <div className="border-t border-gray-400 pt-2">
                  <p>{new Date(meetingDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
