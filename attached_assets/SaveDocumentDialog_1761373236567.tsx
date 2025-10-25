import { useState } from 'react';
import { Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface SaveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (documentName: string) => void;
  defaultName: string;
  documentType: string;
}

export function SaveDocumentDialog({
  open,
  onOpenChange,
  onSave,
  defaultName,
  documentType,
}: SaveDocumentDialogProps) {
  const [documentName, setDocumentName] = useState(defaultName);

  const handleSave = () => {
    if (documentName.trim()) {
      onSave(documentName.trim());
      onOpenChange(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && documentName.trim()) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[#1a5276]">Save Document</DialogTitle>
          <DialogDescription>
            Give this {documentType} a name. This will create a snapshot that won't change when project data is updated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="document-name">Document Name</Label>
            <Input
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., September 2024 Progress Report"
              autoFocus
            />
          </div>
          <div className="text-sm text-muted-foreground bg-[#3498db]/10 p-3 rounded-lg border border-[#3498db]/20">
            <p className="mb-1">💡 <strong>Tip:</strong> Once saved, this document will preserve the current project data.</p>
            <p>It won't update automatically if you edit project information later.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!documentName.trim()}
            className="bg-[#27ae60] hover:bg-[#27ae60]/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}