import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithRoads, InsertLayerProgress } from "@shared/schema";

interface ProgressModalProps {
  project: ProjectWithRoads;
  road: any;
  layerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProgressModal({ 
  project, 
  road, 
  layerId, 
  onClose, 
  onSuccess 
}: ProgressModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    startChainage: "",
    endChainage: "",
    carriagewaySide: "both",
    completionDate: new Date().toISOString().split('T')[0],
    qualityStatus: "approved",
    notes: "",
  });

  const layer = road.layers?.find((l: any) => l.id === layerId);

  const mutation = useMutation({
    mutationFn: async (data: InsertLayerProgress) => {
      await apiRequest("POST", `/api/layers/${layerId}/progress`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Layer progress updated successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update layer progress",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      startChainage: Number(formData.startChainage),
      endChainage: Number(formData.endChainage),
      carriagewaySide: formData.carriagewaySide,
      completionDate: formData.completionDate,
      qualityStatus: formData.qualityStatus,
      notes: formData.notes,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-semibold text-card-foreground">Update Layer Progress</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-close-modal"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Construction Layer</Label>
            <div className="w-full px-4 py-3 border border-input rounded-lg bg-muted text-card-foreground">
              {layer?.name || "Unknown Layer"}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Start Chainage (km)</Label>
              <Input
                type="number"
                step="0.01"
                name="startChainage"
                value={formData.startChainage}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="0.00"
                required
                data-testid="input-start-chainage"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">End Chainage (km)</Label>
              <Input
                type="number"
                step="0.01"
                name="endChainage"
                value={formData.endChainage}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="0.00"
                required
                data-testid="input-end-chainage"
              />
            </div>
          </div>
          
          {road.carriageway === 'dual' && (
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Carriageway Side</Label>
              <Select value={formData.carriagewaySide} onValueChange={(value) => setFormData(prev => ({ ...prev, carriagewaySide: value }))}>
                <SelectTrigger className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all" data-testid="select-carriageway-side">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lhs">Left Hand Side (LHS)</SelectItem>
                  <SelectItem value="rhs">Right Hand Side (RHS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Completion Date</Label>
            <Input
              type="date"
              name="completionDate"
              value={formData.completionDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              required
              data-testid="input-completion-date"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Quality Status</Label>
            <Select value={formData.qualityStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, qualityStatus: value }))}>
              <SelectTrigger className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all" data-testid="select-quality-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="rework">Requires Rework</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Notes</Label>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Add any notes about this section"
              data-testid="textarea-progress-notes"
            />
          </div>
          
          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-6 py-3 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              data-testid="button-update-progress"
            >
              {mutation.isPending ? "Updating..." : "Update Progress"}
            </Button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}
