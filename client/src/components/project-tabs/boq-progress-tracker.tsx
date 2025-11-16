import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Project, ProgressTracker, ProgressTrackerWithItems, WorkPlan, Activity, ProjectWithRoads } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface BOQProgressTrackerProps {
  project: ProjectWithRoads;
}

export default function BOQProgressTracker({ project }: BOQProgressTrackerProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    workPlanId: "",
  });
  
  // Local state for instant input updates
  const [localValues, setLocalValues] = useState<Record<string, { 
    qtyInBoq?: number; 
    rate?: number; 
    amount?: number; 
    qtyDone?: number; 
    rateDone?: number; 
    amountDone?: number; 
    weightedRatio?: number 
  }>>({});

  // Fetch activities for progress calculation
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: [`/api/projects/${project.id}/activities`],
  });

  // Fetch work plans
  const { data: workPlans = [] } = useQuery<WorkPlan[]>({
    queryKey: [`/api/projects/${project.id}/work-plans`],
  });

  // Fetch progress trackers
  const { data: trackers = [], isLoading } = useQuery<ProgressTracker[]>({
    queryKey: [`/api/projects/${project.id}/progress-trackers`],
  });

  // Fetch selected tracker with items
  const { data: selectedTracker } = useQuery<ProgressTrackerWithItems>({
    queryKey: [`/api/progress-trackers/${selectedTrackerId}`],
    enabled: !!selectedTrackerId,
  });
  
  // Clear local values when switching trackers
  useEffect(() => {
    setLocalValues({});
  }, [selectedTrackerId]);

  // Create tracker mutation
  const createTrackerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", `/api/projects/${project.id}/progress-trackers`, data);
    },
    onSuccess: (newTracker: ProgressTracker) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/progress-trackers`] });
      toast({
        title: "Success",
        description: "Progress tracker created successfully",
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", workPlanId: "" });
      setSelectedTrackerId(newTracker.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create progress tracker",
        variant: "destructive",
      });
    },
  });

  // Delete tracker mutation
  const deleteTrackerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/progress-trackers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/progress-trackers`] });
      toast({
        title: "Success",
        description: "Progress tracker deleted successfully",
      });
      if (selectedTrackerId) {
        setSelectedTrackerId(null);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete progress tracker",
        variant: "destructive",
      });
    },
  });

  // Update tracker item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/progress-tracker-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/progress-trackers/${selectedTrackerId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const handleCreateTracker = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter a tracker name",
        variant: "destructive",
      });
      return;
    }
    if (!formData.workPlanId) {
      toast({
        title: "Error",
        description: "Please select a work plan",
        variant: "destructive",
      });
      return;
    }
    
    // Only send workPlanId if it's not empty
    const payload = {
      ...formData,
      workPlanId: formData.workPlanId || undefined,
    };
    createTrackerMutation.mutate(payload);
  };

  // Instant local update for responsive typing
  const handleLocalUpdate = (itemId: string, field: string, value: number) => {
    setLocalValues(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      }
    }));
  };

  // Save to server when user finishes editing (onBlur)
  const handleItemUpdate = (itemId: string, field: string, value: number) => {
    updateItemMutation.mutate({
      id: itemId,
      data: { [field]: value },
    });
  };
  
  // Get value from local state or fallback to server value
  const getValue = (itemId: string, field: string, defaultValue: any) => {
    return localValues[itemId]?.[field as keyof typeof localValues[string]] ?? defaultValue;
  };

  const calculateProgress = (qtyInBoq: string, qtyDone: string): number => {
    const boq = parseFloat(qtyInBoq);
    const done = parseFloat(qtyDone);
    if (!boq || boq === 0) return 0;
    return Math.min(100, (done / boq) * 100);
  };

  const calculateWeightedProgress = (): number => {
    if (!selectedTracker?.items || selectedTracker.items.length === 0) return 0;
    
    const activityItems = selectedTracker.items.filter(item => item.itemType === "activity");
    if (activityItems.length === 0) return 0;
    
    let totalWeightedProgress = 0;
    let totalWeight = 0;
    
    activityItems.forEach(item => {
      const weight = parseFloat(item.weightedRatio || "1");
      const progress = calculateProgress(item.qtyInBoq || "0", item.qtyDone || "0");
      totalWeightedProgress += progress * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
  };

  // Calculate physical progress from road tracker with road-length weighting
  const calculatePhysicalProgress = () => {
    if (!project.roads || project.roads.length === 0) return 0;
    
    // First, calculate total project length (only valid roads)
    const totalProjectLength = project.roads.reduce((sum, road) => {
      const roadLength = parseFloat(road.length);
      return !roadLength || roadLength <= 0 || isNaN(roadLength) ? sum : sum + roadLength;
    }, 0);
    
    if (totalProjectLength === 0) return 0;
    
    let weightedProgress = 0;
    
    project.roads.forEach(road => {
      const roadLength = parseFloat(road.length);
      // Skip roads with invalid lengths
      if (!roadLength || roadLength <= 0 || isNaN(roadLength)) {
        return;
      }
      
      const roadWeight = roadLength / totalProjectLength; // Road's contribution to overall progress
      const isDualCarriageway = road.carriageway === 'dual';
      
      if (road.layers && road.layers.length > 0) {
        let roadProgress = 0;
        let totalLayerWeight = 0;
        
        road.layers.forEach(layer => {
          const layerWeight = layer.weight || 1;
          totalLayerWeight += layerWeight;
          
          if (layer.progress && layer.progress.length > 0) {
            if (isDualCarriageway) {
              // For dual carriageway, calculate LHS and RHS separately and average them
              const lhsProgress = layer.progress
                .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'LHS' || prog.carriagewaySide?.toLowerCase() === 'both')
                .reduce((sum: number, prog: any) => {
                  const start = parseFloat(prog.startChainage as any);
                  const end = parseFloat(prog.endChainage as any);
                  if (isNaN(start) || isNaN(end) || end <= start) return sum;
                  return sum + (end - start);
                }, 0);
              
              const rhsProgress = layer.progress
                .filter((prog: any) => prog.carriagewaySide?.toUpperCase() === 'RHS' || prog.carriagewaySide?.toLowerCase() === 'both')
                .reduce((sum: number, prog: any) => {
                  const start = parseFloat(prog.startChainage as any);
                  const end = parseFloat(prog.endChainage as any);
                  if (isNaN(start) || isNaN(end) || end <= start) return sum;
                  return sum + (end - start);
                }, 0);
              
              const lhsPercentage = Math.min(100, (lhsProgress / roadLength) * 100);
              const rhsPercentage = Math.min(100, (rhsProgress / roadLength) * 100);
              const layerProgress = (lhsPercentage + rhsPercentage) / 2;
              
              roadProgress += layerProgress * layerWeight;
            } else {
              // For single carriageway, sum all progress
              const completedLength = layer.progress.reduce((sum, prog) => {
                const start = parseFloat(prog.startChainage as any);
                const end = parseFloat(prog.endChainage as any);
                if (isNaN(start) || isNaN(end) || end <= start) return sum;
                return sum + (end - start);
              }, 0);
              
              const layerProgress = Math.min(100, (completedLength / roadLength) * 100);
              roadProgress += layerProgress * layerWeight;
            }
          }
        });
        
        // Calculate this road's weighted progress
        const thisRoadProgress = totalLayerWeight > 0 ? roadProgress / totalLayerWeight : 0;
        weightedProgress += thisRoadProgress * roadWeight;
      }
    });
    
    return Math.min(100, Math.round(weightedProgress));
  };

  const physicalProgress = calculatePhysicalProgress();

  // Calculate activity progress from BOQ items
  const activityProgress = activities.length > 0
    ? Math.round(activities.reduce((sum, activity) => sum + activity.progress, 0) / activities.length)
    : 0;

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Loading progress trackers...</div>;
  }

  return (
    <div className="space-y-6" data-testid="boq-progress-tracker">
      {/* Overall Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-progress-tracking">Progress Tracking</CardTitle>
          <CardDescription>Track overall project progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Physical Progress - Only for Road projects */}
            {project.projectType === "Road" && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Physical Progress (Road Construction)</span>
                  <span className="text-sm font-medium" data-testid="text-physical-progress">{physicalProgress}%</span>
                </div>
                <Progress value={physicalProgress} className="h-3" data-testid="progress-physical" />
              </div>
            )}
            
            {/* Activity Progress - For all projects */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Activity Progress (BOQ Items)</span>
                <span className="text-sm font-medium" data-testid="text-activity-progress">{activityProgress}%</span>
              </div>
              <Progress value={activityProgress} className="h-3" data-testid="progress-activity" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">BOQ Progress Tracking</h3>
          <p className="text-sm text-muted-foreground">Track progress based on work plan activities</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-tracker">
              <Plus className="w-4 h-4 mr-2" />
              Create Tracker
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-tracker">
            <DialogHeader>
              <DialogTitle>Create Progress Tracker</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tracker-name">Tracker Name</Label>
                <Input
                  id="tracker-name"
                  data-testid="input-tracker-name"
                  placeholder="e.g., Phase 1 Progress"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-plan">Work Plan</Label>
                <Select
                  value={formData.workPlanId}
                  onValueChange={(value) => setFormData({ ...formData, workPlanId: value })}
                >
                  <SelectTrigger id="work-plan" data-testid="select-work-plan">
                    <SelectValue placeholder={workPlans.length > 0 ? "Select a work plan" : "No work plans available"} />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {workPlans.length > 0 ? (
                      workPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id} data-testid={`option-work-plan-${plan.id}`}>
                          {plan.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No work plans available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Add description..."
                  minHeight="100px"
                  data-testid="input-tracker-description"
                />
              </div>
              <Button
                onClick={handleCreateTracker}
                disabled={createTrackerMutation.isPending}
                className="w-full"
                data-testid="button-submit-tracker"
              >
                {createTrackerMutation.isPending ? "Creating..." : "Create Tracker"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tracker selector */}
      {trackers.length > 0 && (
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Label>Select Tracker</Label>
            <Select
              value={selectedTrackerId || ""}
              onValueChange={setSelectedTrackerId}
            >
              <SelectTrigger data-testid="select-tracker">
                <SelectValue placeholder="Select a tracker to view" />
              </SelectTrigger>
              <SelectContent>
                {trackers.map((tracker) => (
                  <SelectItem key={tracker.id} value={tracker.id}>
                    {tracker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTrackerId && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to delete this tracker?")) {
                  deleteTrackerMutation.mutate(selectedTrackerId);
                }
              }}
              data-testid="button-delete-tracker"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Tracker view */}
      {selectedTracker && (
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Overall Progress</span>
              <span className="text-lg font-bold" data-testid="text-overall-progress">
                {calculateWeightedProgress().toFixed(1)}%
              </span>
            </div>
            <Progress value={calculateWeightedProgress()} className="h-3" />
          </div>

          {/* Items table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-[100px]">Qty in BOQ</TableHead>
                  <TableHead className="w-[100px]">Rate</TableHead>
                  <TableHead className="w-[120px]">Amount</TableHead>
                  <TableHead className="w-[100px]">Qty Done</TableHead>
                  <TableHead className="w-[100px]">Rate Done</TableHead>
                  <TableHead className="w-[120px]">Amount Done</TableHead>
                  <TableHead className="w-[80px]">Weight</TableHead>
                  <TableHead className="w-[180px]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTracker.items.map((item) => {
                  const isSection = item.itemType === "section";
                  // Use local values for instant updates
                  const qtyInBoq = getValue(item.id, "qtyInBoq", item.qtyInBoq || "0");
                  const rate = getValue(item.id, "rate", item.rate || "0");
                  const qtyDone = getValue(item.id, "qtyDone", item.qtyDone || "0");
                  const rateDone = getValue(item.id, "rateDone", item.rateDone || "0");
                  
                  // Auto-calculate amounts
                  const amount = parseFloat(String(qtyInBoq)) * parseFloat(String(rate));
                  const amountDone = parseFloat(String(qtyDone)) * parseFloat(String(rateDone));
                  const progress = calculateProgress(String(qtyInBoq), String(qtyDone));

                  return (
                    <TableRow
                      key={item.id}
                      className={isSection ? "bg-muted/30 font-semibold" : ""}
                      data-testid={`row-tracker-item-${item.id}`}
                    >
                      <TableCell className={isSection ? "pl-4" : "pl-8"}>
                        {item.description}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={getValue(item.id, "qtyInBoq", item.qtyInBoq || "0")}
                            onChange={(e) => handleLocalUpdate(item.id, "qtyInBoq", parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleItemUpdate(item.id, "qtyInBoq", parseFloat(e.target.value) || 0)}
                            className="h-8"
                            data-testid={`input-qty-boq-${item.id}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={getValue(item.id, "rate", item.rate || "0")}
                            onChange={(e) => handleLocalUpdate(item.id, "rate", parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleItemUpdate(item.id, "rate", parseFloat(e.target.value) || 0)}
                            className="h-8"
                            data-testid={`input-rate-${item.id}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <div className="px-2 py-1 text-sm font-medium bg-muted/50 rounded" data-testid={`text-amount-${item.id}`}>
                            {amount.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={getValue(item.id, "qtyDone", item.qtyDone || "0")}
                            onChange={(e) => handleLocalUpdate(item.id, "qtyDone", parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleItemUpdate(item.id, "qtyDone", parseFloat(e.target.value) || 0)}
                            className="h-8"
                            data-testid={`input-qty-done-${item.id}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={getValue(item.id, "rateDone", item.rateDone || "0")}
                            onChange={(e) => handleLocalUpdate(item.id, "rateDone", parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleItemUpdate(item.id, "rateDone", parseFloat(e.target.value) || 0)}
                            className="h-8"
                            data-testid={`input-rate-done-${item.id}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <div className="px-2 py-1 text-sm font-medium bg-muted/50 rounded" data-testid={`text-amount-done-${item.id}`}>
                            {amountDone.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={getValue(item.id, "weightedRatio", item.weightedRatio || "1")}
                            onChange={(e) => handleLocalUpdate(item.id, "weightedRatio", parseFloat(e.target.value) || 1)}
                            onBlur={(e) => handleItemUpdate(item.id, "weightedRatio", parseFloat(e.target.value) || 1)}
                            className="h-8"
                            data-testid={`input-weight-${item.id}`}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSection && (
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="flex-1 h-2" />
                            <span className="text-sm font-medium min-w-[50px] text-right" data-testid={`text-progress-${item.id}`}>
                              {progress.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {trackers.length === 0 && (
        <div className="text-center p-8 text-muted-foreground">
          <p>No progress trackers yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
