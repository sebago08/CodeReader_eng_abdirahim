import { FileText, Plus, FileCheck, FileSignature, Mail, Eye, ChevronDown, Users } from 'lucide-react';
import { Project, DocumentType } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface ProjectDocumentsTabProps {
  project: Project;
  onCreateDocument: (documentType: DocumentType) => void;
  onViewDocument: (documentId: string) => void;
}

export function ProjectDocumentsTab({ project, onCreateDocument, onViewDocument }: ProjectDocumentsTabProps) {
  const documentTemplates = [
    {
      type: 'progress-report' as DocumentType,
      name: 'Monthly Progress Report',
      icon: FileText,
      color: '#1a5276',
    },
    {
      type: 'taking-over-certificate' as DocumentType,
      name: 'Taking Over Certificate',
      icon: FileCheck,
      color: '#27ae60',
    },
    {
      type: 'commencement-order' as DocumentType,
      name: 'Commencement Order',
      icon: FileSignature,
      color: '#9b59b6',
    },
    {
      type: 'instruction-letter' as DocumentType,
      name: 'Instruction Letter',
      icon: Mail,
      color: '#f39c12',
    },
    {
      type: 'meeting-minutes' as DocumentType,
      name: 'Meeting Minutes',
      icon: Users,
      color: '#3498db',
    },
  ];

  // Group documents by type
  const documentsByType: Record<DocumentType, Array<{ documentId: string; documentName: string; createdDate: string }>> = {
    'progress-report': [],
    'taking-over-certificate': [],
    'commencement-order': [],
    'instruction-letter': [],
    'meeting-minutes': [],
  };

  project.documents?.forEach(doc => {
    documentsByType[doc.type].push({
      documentId: doc.id,
      documentName: doc.name,
      createdDate: doc.createdDate,
    });
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalDocuments = project.documents?.length || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-[#1a5276] mb-1">Project Documents</h3>
          <p className="text-sm text-muted-foreground">
            {totalDocuments} {totalDocuments === 1 ? 'document' : 'documents'} created
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-[#1a5276] hover:bg-[#14455f]">
              <Plus className="w-4 h-4 mr-2" />
              Create New Document
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {documentTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <DropdownMenuItem
                  key={template.type}
                  onClick={() => onCreateDocument(template.type)}
                  className="cursor-pointer"
                >
                  <Icon className="w-4 h-4 mr-3" style={{ color: template.color }} />
                  <span>{template.name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {totalDocuments === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="mb-2">No documents yet</h3>
              <p className="text-sm mb-6">Create your first document using the button above</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-[#1a5276] border-[#1a5276] hover:bg-[#1a5276] hover:text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Document
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64">
                  {documentTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <DropdownMenuItem
                        key={template.type}
                        onClick={() => onCreateDocument(template.type)}
                        className="cursor-pointer"
                      >
                        <Icon className="w-4 h-4 mr-3" style={{ color: template.color }} />
                        <span>{template.name}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {documentTemplates.map((template) => {
            const Icon = template.icon;
            const docs = documentsByType[template.type];
            
            if (docs.length === 0) return null;

            return (
              <Card key={template.type}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: template.color }} />
                    </div>
                    <div>
                      <h3 className="text-[#1a5276]">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {docs.length} {docs.length === 1 ? 'document' : 'documents'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docs.map((doc, index) => (
                        <TableRow key={`${doc.documentId}-${index}`}>
                          <TableCell>
                            {doc.documentName}
                          </TableCell>
                          <TableCell>{formatDate(doc.createdDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDocument(doc.documentId)}
                              className="text-[#1a5276] border-[#1a5276] hover:bg-[#1a5276] hover:text-white"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
