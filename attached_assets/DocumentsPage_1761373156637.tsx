import { FileText, Plus, FileCheck, FileSignature, Mail, Eye, ChevronDown } from 'lucide-react';
import { Project, DocumentType } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { useState } from 'react';

interface DocumentsPageProps {
  projects: Project[];
  onCreateDocument: (projectId: number, documentType: DocumentType) => void;
  onViewDocument: (projectId: number, documentId: string) => void;
}

export function DocumentsPage({ projects, onCreateDocument, onViewDocument }: DocumentsPageProps) {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);

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
  ];

  const handleCreateDocumentClick = (documentType: DocumentType) => {
    setSelectedDocumentType(documentType);
    setShowProjectModal(true);
  };

  const handleSelectProject = (projectId: number) => {
    if (selectedDocumentType) {
      onCreateDocument(projectId, selectedDocumentType);
      setShowProjectModal(false);
      setSelectedDocumentType(null);
    }
  };

  // Group all documents by type
  const documentsByType: Record<DocumentType, Array<{ project: Project; documentId: string; documentName: string; createdDate: string }>> = {
    'progress-report': [],
    'taking-over-certificate': [],
    'commencement-order': [],
    'instruction-letter': [],
  };

  projects.forEach(project => {
    project.documents?.forEach(doc => {
      documentsByType[doc.type].push({
        project,
        documentId: doc.id,
        documentName: doc.name,
        createdDate: doc.createdDate,
      });
    });
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-[#3498db] text-white';
      case 'completed':
        return 'bg-[#27ae60] text-white';
      case 'on-hold':
        return 'bg-[#f39c12] text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedTemplate = documentTemplates.find(t => t.type === selectedDocumentType);

  return (
    <div>
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <h1 className="text-[#1a5276]">Project Documents</h1>
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
                  onClick={() => handleCreateDocumentClick(template.type)}
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

      {/* Document Categories */}
      <div className="space-y-6">
        {documentTemplates.map((template) => {
          const Icon = template.icon;
          const docs = documentsByType[template.type];
          
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
                    <h2 className="text-[#1a5276]">{template.name}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {docs.length} {docs.length === 1 ? 'document' : 'documents'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {docs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No documents created yet</p>
                    <p className="text-sm mt-1">Click "Create New Document" to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Project Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docs.map((doc, index) => (
                        <TableRow key={`${doc.project.id}-${doc.documentId}-${index}`}>
                          <TableCell>
                            {doc.documentName}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{doc.project.name}</div>
                              <div className="text-sm text-muted-foreground">{doc.project.number}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(doc.project.status)}>
                              {doc.project.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(doc.createdDate)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDocument(doc.project.id, doc.documentId)}
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
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Project Selection Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a5276]">
              Select Project for {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Choose which project to create this document for:
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Project ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>{project.name}</TableCell>
                    <TableCell>{project.number}</TableCell>
                    <TableCell>{project.client.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSelectProject(project.id)}
                        className="bg-[#1a5276] hover:bg-[#14455f]"
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
