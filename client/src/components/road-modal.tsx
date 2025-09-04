import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ProjectWithRoads } from "@shared/schema";

interface RoadModalProps {
  project: ProjectWithRoads;
  road?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const LAYER_OPTIONS = [
  { id: "excavation", name: "Excavation & Earthwork", weight: 1 },
  { id: "base", name: "Base Course", weight: 1 },
  { id: "binder", name: "Binder Course", weight: 1 },
  { id: "surface", name: "Surface Course", weight: 1 },
];

export default function RoadModal({ project, road, onClose, onSuccess }: RoadModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    length: "",
    roadType: "",
    carriageway: "single",
  });
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);

  useEffect(() => {
    if (road) {
      setFormData({
        name: road.name || "",
        length: road.length?.toString() || "",
        roadType: road.roadType || "",
        carriageway: road.carriageway || "single",
      });
      setSelectedLayers(road.layers?.map((l: any) => l.name) || []);
    } else {
      setSelectedLayers(["excavation", "base", "binder"]);
    }
  }, [road]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (road) {
        await apiRequest("PATCH", `/api/roads/${road.id}`, data);
      } else {
        const layers = LAYER_OPTIONS.filter(layer => 
          selectedLayers.includes(layer.id)
        ).map(layer => ({
          name: layer.name,
          weight: layer.weight,
        }));
        
        await apiRequest("POST", `/api/projects/${project.id}/roads`, {
          ...data,
          layers,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Road ${road ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: `Failed to ${road ? "update" : "create"} road`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      length: parseFloat(formData.length),
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleLayerToggle = (layerId: string, checked: boolean) => {
    setSelectedLayers(prev => 
      checked 
        ? [...prev, layerId]
        : prev.filter(id => id !== layerId)
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-semibold text-card-foreground">
            {road ? "Edit Road" : "Add Road to Project"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-close-modal"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Road Name</Label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Enter road name"
              required
              data-testid="input-road-name"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Length (km)</Label>
            <Input
              type="number"
              step="0.1"
              name="length"
              value={formData.length}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Enter road length"
              required
              data-testid="input-road-length"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Road Type</Label>
              <Select value={formData.roadType} onValueChange={(value) => setFormData(prev => ({ ...prev, roadType: value }))}>
                <SelectTrigger className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all" data-testid="select-road-type">
                  <SelectValue placeholder="Select road type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highway">Highway</SelectItem>
                  <SelectItem value="arterial">Arterial Road</SelectItem>
                  <SelectItem value="collector">Collector Road</SelectItem>
                  <SelectItem value="local">Local Road</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Carriageway</Label>
              <Select value={formData.carriageway} onValueChange={(value) => setFormData(prev => ({ ...prev, carriageway: value }))}>
                <SelectTrigger className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all" data-testid="select-carriageway">
                  <SelectValue placeholder="Select carriageway type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Carriageway</SelectItem>
                  <SelectItem value="dual">Dual Carriageway</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {!road && (
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Construction Layers</Label>
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                {LAYER_OPTIONS.map((layer) => (
                  <label key={layer.id} className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedLayers.includes(layer.id)}
                      onCheckedChange={(checked) => handleLayerToggle(layer.id, !!checked)}
                      className="rounded"
                      data-testid={`checkbox-layer-${layer.id}`}
                    />
                    <span className="text-sm">{layer.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
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
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors"
              data-testid="button-submit-road"
            >
              {mutation.isPending ? "Saving..." : road ? "Update Road" : "Add Road"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
