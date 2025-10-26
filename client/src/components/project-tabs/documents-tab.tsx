import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Plus, FileCheck, FileSignature, Mail, Eye, Users, Trash2, ChevronDown, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProjectWithRoads, DocumentType, ProjectDocument } from "@shared/schema";
import { ProgressReport } from "@/components/document-viewers/progress-report";

interface DocumentsTabProps {
  project: ProjectWithRoads;
}

const DOCUMENT_TEMPLATES = [
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

export function DocumentsTab({ project }: DocumentsTabProps) {
  const { toast } = useToast();
  const [viewingDocument, setViewingDocument] = useState<ProjectDocument | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{ documentType: DocumentType; projectSnapshot: any } | null>(null);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);
  
  // Fetch documents for this project
  const { data: documents = [], isLoading } = useQuery<ProjectDocument[]>({
    queryKey: ['/api/projects', project.id, 'documents'],
  });

  // Create document mutation - MUST BE BEFORE CONDITIONAL RETURNS
  const createDocumentMutation = useMutation<ProjectDocument, Error, { documentType: DocumentType; documentName: string; images?: any }>({
    mutationFn: async ({ documentType, documentName, images }: { documentType: DocumentType; documentName: string; images?: any }) => {
      // Create a snapshot of the current project data
      const projectSnapshot = {
        ...project,
        // Add any additional computed fields if needed
      };
      
      return await apiRequest("POST", `/api/projects/${project.id}/documents`, {
        documentType,
        documentName,
        projectSnapshot,
        customContent: images || {}, // Store images in customContent
      }) as unknown as ProjectDocument;
    },
    onSuccess: (newDocument: ProjectDocument) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'documents'] });
      toast({
        title: "Document saved",
        description: "Your document has been saved successfully.",
      });
      setPreviewDocument(null);
      setViewingDocument(newDocument);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation<ProjectDocument, Error, { documentId: string; documentName: string; images?: any }>({
    mutationFn: async ({ documentId, documentName, images }) => {
      return await apiRequest("PATCH", `/api/documents/${documentId}`, {
        documentName,
        customContent: images || {},
      }) as unknown as ProjectDocument;
    },
    onSuccess: (updatedDocument: ProjectDocument) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'documents'] });
      toast({
        title: "Document updated",
        description: "Your document has been updated successfully.",
      });
      setEditingDocument(null);
      setViewingDocument(updatedDocument);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'documents'] });
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateDocument = (documentType: DocumentType) => {
    // Create a preview instead of saving immediately
    const projectSnapshot = {
      ...project,
    };
    setPreviewDocument({ documentType, projectSnapshot });
  };

  const handleSaveDocument = (documentName: string, images?: any) => {
    console.log('handleSaveDocument called', { editingDocument, previewDocument, documentName });
    if (editingDocument) {
      console.log('Updating document:', editingDocument.id);
      // Update existing document
      updateDocumentMutation.mutate({
        documentId: editingDocument.id,
        documentName,
        images,
      });
    } else if (previewDocument) {
      console.log('Creating new document');
      // Create new document
      createDocumentMutation.mutate({
        documentType: previewDocument.documentType,
        documentName,
        images,
      });
    } else {
      console.error('Neither editingDocument nor previewDocument is set!');
    }
  };

  const handleEditDocument = (doc: ProjectDocument) => {
    console.log('handleEditDocument called with:', doc);
    setEditingDocument(doc);
    setPreviewDocument(null); // Clear preview document when editing
  };

  const handleCancelPreview = () => {
    setPreviewDocument(null);
    setEditingDocument(null);
  };

  const handleDeleteDocument = (documentId: string) => {
    if (confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  // Group documents by type
  const documentsByType: Record<DocumentType, ProjectDocument[]> = {
    'progress-report': [],
    'taking-over-certificate': [],
    'commencement-order': [],
    'instruction-letter': [],
    'meeting-minutes': [],
  };

  documents.forEach(doc => {
    if (documentsByType[doc.documentType as DocumentType]) {
      documentsByType[doc.documentType as DocumentType].push(doc);
    }
  });

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalDocuments = documents.length;

  // Conditional rendering for editing mode
  if (editingDocument) {
    if (editingDocument.documentType === 'progress-report') {
      return (
        <ProgressReport 
          document={editingDocument}
          project={editingDocument.projectSnapshot as any}
          isPreview={true}
          isSaving={updateDocumentMutation.isPending}
          onSave={handleSaveDocument}
          onCancel={handleCancelPreview}
        />
      );
    }
    
    // For other document types, show placeholder for now
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={handleCancelPreview}
          data-testid="button-cancel-edit"
        >
          ← Back to Documents
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Editing for {editingDocument.documentType} coming soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Conditional rendering for preview mode
  if (previewDocument) {
    if (previewDocument.documentType === 'progress-report') {
      return (
        <ProgressReport 
          project={previewDocument.projectSnapshot}
          isPreview={true}
          isSaving={createDocumentMutation.isPending}
          onSave={handleSaveDocument}
          onCancel={handleCancelPreview}
        />
      );
    }
    
    // For other document types, show placeholder for now
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={handleCancelPreview}
          data-testid="button-cancel-preview"
        >
          ← Back to Documents
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Preview for {previewDocument.documentType} coming soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Conditional rendering for viewing a saved document
  if (viewingDocument) {
    if (viewingDocument.documentType === 'progress-report') {
      return (
        <ProgressReport 
          document={viewingDocument}
          onBack={() => setViewingDocument(null)}
        />
      );
    }
    
    // For other document types, show placeholder for now
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setViewingDocument(null)}
          data-testid="button-back-to-documents"
        >
          ← Back to Documents
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Viewer for {viewingDocument.documentType} coming soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-[#1a5276] mb-1">Project Documents</h3>
          <p className="text-sm text-muted-foreground">
            {totalDocuments} {totalDocuments === 1 ? 'document' : 'documents'} created
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-[#1a5276] hover:bg-[#14455f]" data-testid="button-create-document">
              <Plus className="w-4 h-4 mr-2" />
              Create New Document
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {DOCUMENT_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <DropdownMenuItem
                  key={template.type}
                  onClick={() => handleCreateDocument(template.type)}
                  className="cursor-pointer"
                  data-testid={`option-${template.type}`}
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
              <h3 className="mb-2 font-medium">No documents yet</h3>
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
                  {DOCUMENT_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <DropdownMenuItem
                        key={template.type}
                        onClick={() => handleCreateDocument(template.type)}
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
          {DOCUMENT_TEMPLATES.map((template) => {
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
                      <h3 className="font-semibold text-[#1a5276]">{template.name}</h3>
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
                      {docs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell data-testid={`text-document-name-${doc.id}`}>
                            {doc.documentName}
                          </TableCell>
                          <TableCell>{formatDate(doc.createdAt!)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingDocument(doc)}
                                className="text-[#1a5276] border-[#1a5276] hover:bg-[#1a5276] hover:text-white"
                                data-testid={`button-view-document-${doc.id}`}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditDocument(doc)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                                data-testid={`button-edit-document-${doc.id}`}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                                data-testid={`button-delete-document-${doc.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
