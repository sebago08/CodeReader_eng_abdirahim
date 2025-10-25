import { useState } from 'react';
import { Plus, FileText, Calendar, Edit, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import { BOQ, ProjectSummary } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BOQEditor } from './BOQEditor';
import { ProjectSummaryEditor } from './ProjectSummaryEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { exportMultipleBOQsToExcel } from '../lib/utils/boq-export';

interface BOQModuleProps {
  boqs: BOQ[];
  onCreateBOQ: (boq: BOQ) => void;
  onUpdateBOQ: (boq: BOQ) => void;
  onDeleteBOQ: (boqId: string) => void;
  projectName?: string;
  projectSummary?: ProjectSummary;
  onUpdateProjectSummary?: (summary: ProjectSummary) => void;
}

export function BOQModule({ 
  boqs, 
  onCreateBOQ, 
  onUpdateBOQ, 
  onDeleteBOQ, 
  projectName,
  projectSummary,
  onUpdateProjectSummary 
}: BOQModuleProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBOQName, setNewBOQName] = useState('');
  const [editingBOQ, setEditingBOQ] = useState<BOQ | null>(null);
  const [deletingBOQId, setDeletingBOQId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('boqs');

  const handleCreateBOQ = () => {
    if (!newBOQName.trim()) return;

    const newBOQ: BOQ = {
      id: Date.now().toString(),
      name: newBOQName,
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      items: [],
    };

    onCreateBOQ(newBOQ);
    setNewBOQName('');
    setIsCreateDialogOpen(false);
    setEditingBOQ(newBOQ);
  };

  const handleSaveBOQ = (updatedBOQ: BOQ) => {
    onUpdateBOQ({
      ...updatedBOQ,
      lastModified: new Date().toISOString(),
    });
    setEditingBOQ(null);
  };

  const handleDeleteBOQ = () => {
    if (deletingBOQId) {
      onDeleteBOQ(deletingBOQId);
      setDeletingBOQId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateBOQTotal = (boq: BOQ) => {
    return boq.items
      .filter(item => item.type === 'item')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const countItems = (boq: BOQ) => {
    return boq.items.filter(item => item.type === 'item').length;
  };

  if (editingBOQ) {
    return (
      <BOQEditor
        boq={editingBOQ}
        onSave={handleSaveBOQ}
        onCancel={() => setEditingBOQ(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl text-[#1a5276]">Bill of Quantities</h2>
          <p className="text-muted-foreground mt-1">Create and manage BOQs for this project</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#1a5276] hover:bg-[#14455f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New BOQ
          </Button>
          <Button
            onClick={() => exportMultipleBOQsToExcel(boqs, projectName, projectSummary)}
            className="bg-[#1a5276] hover:bg-[#14455f]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export BOQs
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="boqs">BOQs</TabsTrigger>
          <TabsTrigger value="summary">Project Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="boqs">
          {boqs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-8">
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg mb-2">No BOQs created yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first Bill of Quantities to start managing project costs
                  </p>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-[#1a5276] hover:bg-[#14455f]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create BOQ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boqs.map((boq) => (
                <Card key={boq.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1a5276]">
                      <FileText className="w-5 h-5" />
                      {boq.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Created: {formatDate(boq.createdDate)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Last modified: {formatDate(boq.lastModified)}
                      </div>
                      <div className="pt-3 border-t">
                        <div className="text-sm mb-1">
                          <span className="text-muted-foreground">Items:</span>{' '}
                          <span>{countItems(boq)}</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Total:</span>{' '}
                          <span className="text-lg text-[#1a5276]">
                            ${calculateBOQTotal(boq).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3">
                        <Button
                          onClick={() => setEditingBOQ(boq)}
                          className="flex-1 bg-[#1a5276] hover:bg-[#14455f]"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                        <Button
                          onClick={() => setDeletingBOQId(boq.id)}
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="summary">
          {onUpdateProjectSummary ? (
            <ProjectSummaryEditor
              boqs={boqs}
              projectSummary={projectSummary}
              onSave={onUpdateProjectSummary}
              projectName={projectName}
            />
          ) : (
            <Card>
              <CardContent className="pt-6 pb-8">
                <div className="text-center py-12">
                  <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg mb-2">Project Summary not available</h3>
                  <p className="text-muted-foreground mb-6">
                    Project summary feature is not configured for this project
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create BOQ Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New BOQ</DialogTitle>
            <DialogDescription>
              Enter a name for your new Bill of Quantities
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="boq-name">BOQ Name</Label>
            <Input
              id="boq-name"
              value={newBOQName}
              onChange={(e) => setNewBOQName(e.target.value)}
              placeholder="e.g., Main BOQ, Revised BOQ, etc."
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateBOQ();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBOQ}
              disabled={!newBOQName.trim()}
              className="bg-[#1a5276] hover:bg-[#14455f]"
            >
              Create BOQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBOQId} onOpenChange={() => setDeletingBOQId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the BOQ and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBOQ}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}