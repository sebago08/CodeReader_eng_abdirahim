import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileSpreadsheet, Save, Trash2, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BOQSpreadsheet from "@/components/boq-spreadsheet";

interface ProjectBOQTabProps {
  projectId: string;
}

export default function ProjectBOQTab({ projectId }: ProjectBOQTabProps) {
  const { toast } = useToast();
  const [selectedBOQId, setSelectedBOQId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBOQName, setNewBOQName] = useState("");
  const [newBOQDescription, setNewBOQDescription] = useState("");

  // Fetch all BOQs for this project
  const { data: boqs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/projects", projectId, "boqs"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/boqs`);
      if (!res.ok) throw new Error("Failed to fetch BOQs");
      return res.json();
    },
  });

  // Create new BOQ mutation
  const createBOQMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/boqs`, data);
      return await res.json();
    },
    onSuccess: (newBOQ) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "boqs"] });
      setSelectedBOQId(newBOQ.id);
      setShowCreateDialog(false);
      setNewBOQName("");
      setNewBOQDescription("");
      toast({
        title: "Success",
        description: "BOQ created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create BOQ",
        variant: "destructive",
      });
    },
  });

  const handleCreateBOQ = () => {
    if (!newBOQName.trim()) {
      toast({
        title: "Error",
        description: "BOQ name is required",
        variant: "destructive",
      });
      return;
    }
    createBOQMutation.mutate({
      name: newBOQName,
      description: newBOQDescription,
    });
  };

  // Auto-select first BOQ if none selected
  if (!selectedBOQId && boqs && boqs.length > 0) {
    setSelectedBOQId(boqs[0].id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bill of Quantities</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage project BOQ with hierarchical items</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BOQ Selector */}
          {boqs && boqs.length > 0 && (
            <Select value={selectedBOQId || ""} onValueChange={setSelectedBOQId}>
              <SelectTrigger className="w-[250px]" data-testid="select-boq">
                <SelectValue placeholder="Select a BOQ" />
              </SelectTrigger>
              <SelectContent>
                {boqs.map((boq) => (
                  <SelectItem key={boq.id} value={boq.id}>
                    {boq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Create BOQ Button */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-boq">
                <Plus className="w-4 h-4 mr-2" />
                Create BOQ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New BOQ</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="boq-name">Name *</Label>
                  <Input
                    id="boq-name"
                    value={newBOQName}
                    onChange={(e) => setNewBOQName(e.target.value)}
                    placeholder="Enter BOQ name"
                    data-testid="input-boq-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boq-description">Description</Label>
                  <Input
                    id="boq-description"
                    value={newBOQDescription}
                    onChange={(e) => setNewBOQDescription(e.target.value)}
                    placeholder="Enter description (optional)"
                    data-testid="input-boq-description"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel-create-boq"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBOQ}
                    disabled={createBOQMutation.isPending}
                    data-testid="button-submit-create-boq"
                  >
                    {createBOQMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Empty State */}
      {!isLoading && (!boqs || boqs.length === 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
              <div>
                <CardTitle>No BOQs Found</CardTitle>
                <CardDescription>Create your first Bill of Quantities to get started</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Click "Create BOQ" above to add a new Bill of Quantities</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOQ Spreadsheet */}
      {selectedBOQId && (
        <BOQSpreadsheet boqId={selectedBOQId} />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading BOQs...
        </div>
      )}
    </div>
  );
}
