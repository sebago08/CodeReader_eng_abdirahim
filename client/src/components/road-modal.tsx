import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithRoads } from "@shared/schema";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";

interface RoadModalProps {
  project: ProjectWithRoads;
  road?: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface LayerOption {
  id: string;
  name: string;
  weight: number;
  isCustom?: boolean;
}

const DEFAULT_LAYER_OPTIONS: LayerOption[] = [
  { id: "excavation", name: "Excavation & Earthwork", weight: 1 },
  { id: "bottom-subgrade", name: "Bottom Sub Grade", weight: 1 },
  { id: "top-subgrade", name: "Top Sub Grade", weight: 1 },
  { id: "bottom-subbase", name: "Bottom Sub Base", weight: 1 },
  { id: "top-subbase", name: "Top Sub Base", weight: 1 },
  { id: "base", name: "Base", weight: 1 },
  { id: "asphalt-concrete", name: "Asphalt Concrete", weight: 1 },
];

export default function RoadModal({ project, road, onClose, onSuccess }: RoadModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    length: "",
    roadType: "",
    carriageway: "single",
  });
  const [layerOptions, setLayerOptions] = useState<LayerOption[]>(DEFAULT_LAYER_OPTIONS);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState("");

  useEffect(() => {
    if (road) {
      setFormData({
        name: road.name || "",
        length: road.length?.toString() || "",
        roadType: road.roadType || "",
        carriageway: road.carriageway || "single",
      });
      
      // Load existing layers from the road
      if (road.layers && road.layers.length > 0) {
        const existingLayers: LayerOption[] = road.layers.map((l: any, index: number) => ({
          id: l.id || `layer-${index}`,
          name: l.name,
          weight: l.weight || 1,
          isCustom: !DEFAULT_LAYER_OPTIONS.find(opt => opt.name === l.name),
        }));
        
        setLayerOptions(existingLayers);
        setSelectedLayers(existingLayers.map(l => l.id));
      }
    } else {
      setSelectedLayers(["excavation", "bottom-subgrade", "top-subgrade", "bottom-subbase", "top-subbase", "base", "asphalt-concrete"]);
    }
  }, [road]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (road) {
        // When editing, also update the layers
        const layers = layerOptions
          .filter(layer => selectedLayers.includes(layer.id))
          .map(layer => ({
            name: layer.name,
            weight: layer.weight,
          }));
        
        await apiRequest("PATCH", `/api/roads/${road.id}`, {
          ...data,
          layers,
        });
      } else {
        const layers = layerOptions
          .filter(layer => selectedLayers.includes(layer.id))
          .map(layer => ({
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

  const handleAddLayer = () => {
    const newLayerId = `custom-${Date.now()}`;
    const newLayer: LayerOption = {
      id: newLayerId,
      name: "New Layer",
      weight: 1,
      isCustom: true,
    };
    
    setLayerOptions(prev => [...prev, newLayer]);
    setSelectedLayers(prev => [...prev, newLayerId]);
    setEditingLayerId(newLayerId);
    setEditingLayerName("New Layer");
  };

  const handleStartEditLayer = (layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingLayerName(currentName);
  };

  const handleSaveLayerName = () => {
    if (editingLayerId && editingLayerName.trim()) {
      setLayerOptions(prev => 
        prev.map(layer => 
          layer.id === editingLayerId 
            ? { ...layer, name: editingLayerName.trim() }
            : layer
        )
      );
      setEditingLayerId(null);
      setEditingLayerName("");
    }
  };

  const handleCancelEditLayer = () => {
    // If it's a new layer that was just added and user cancels, remove it
    if (editingLayerId?.startsWith('custom-')) {
      const layer = layerOptions.find(l => l.id === editingLayerId);
      if (layer && layer.name === "New Layer") {
        setLayerOptions(prev => prev.filter(l => l.id !== editingLayerId));
        setSelectedLayers(prev => prev.filter(id => id !== editingLayerId));
      }
    }
    setEditingLayerId(null);
    setEditingLayerName("");
  };

  const handleDeleteLayer = (layerId: string) => {
    setLayerOptions(prev => prev.filter(l => l.id !== layerId));
    setSelectedLayers(prev => prev.filter(id => id !== layerId));
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
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="block text-sm font-medium text-muted-foreground">Construction Layers</Label>
              <Button
                type="button"
                onClick={handleAddLayer}
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs"
                data-testid="button-add-layer"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Layer
              </Button>
            </div>
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg max-h-64 overflow-y-auto">
              {layerOptions.map((layer) => (
                <div key={layer.id} className="flex items-center space-x-3 group">
                  <Checkbox
                    checked={selectedLayers.includes(layer.id)}
                    onCheckedChange={(checked) => handleLayerToggle(layer.id, !!checked)}
                    className="rounded"
                    data-testid={`checkbox-layer-${layer.id}`}
                  />
                  
                  {editingLayerId === layer.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        type="text"
                        value={editingLayerName}
                        onChange={(e) => setEditingLayerName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveLayerName();
                          } else if (e.key === 'Escape') {
                            handleCancelEditLayer();
                          }
                        }}
                        data-testid={`input-edit-layer-${layer.id}`}
                      />
                      <Button
                        type="button"
                        onClick={handleSaveLayerName}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        data-testid={`button-save-layer-${layer.id}`}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelEditLayer}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        data-testid={`button-cancel-edit-layer-${layer.id}`}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditLayer(layer.id, layer.name)}
                        className="text-sm text-left hover:text-primary transition-colors flex items-center gap-2 flex-1"
                        data-testid={`button-edit-layer-name-${layer.id}`}
                      >
                        {layer.name}
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                      
                      {layer.isCustom && (
                        <Button
                          type="button"
                          onClick={() => handleDeleteLayer(layer.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-delete-layer-${layer.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
