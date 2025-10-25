import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProjectWithRoads, InsertProject } from "@shared/schema";

interface ProjectModalProps {
  project?: ProjectWithRoads | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProjectModal({ project, onClose, onSuccess }: ProjectModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
    projectType: "Road",
    status: "Active",
    totalBudget: "",
    spentAmount: "",
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        client: project.client || "",
        location: project.location || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        description: project.description || "",
        projectType: project.projectType || "Road",
        status: project.status || "Active",
        totalBudget: project.totalBudget || "",
        spentAmount: project.spentAmount || "",
      });
    }
  }, [project]);

  const mutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      if (project) {
        await apiRequest("PATCH", `/api/projects/${project.id}`, data);
      } else {
        await apiRequest("POST", "/api/projects", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Project ${project ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${project ? "update" : "create"} project`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up form data - convert empty strings to undefined for numeric fields
    const cleanedData = {
      ...formData,
      totalBudget: formData.totalBudget === "" ? undefined : formData.totalBudget,
      spentAmount: formData.spentAmount === "" ? undefined : formData.spentAmount,
    };
    
    mutation.mutate(cleanedData as any);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-semibold text-card-foreground">
            {project ? "Edit Project" : "Add New Project"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Project Name</Label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Enter project name"
                required
                data-testid="input-project-name"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Client</Label>
              <Input
                type="text"
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Enter client name"
                required
                data-testid="input-project-client"
              />
            </div>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Location</Label>
            <Input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Enter project location"
              required
              data-testid="input-project-location"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Start Date</Label>
              <Input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                required
                data-testid="input-project-start-date"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">End Date</Label>
              <Input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                required
                data-testid="input-project-end-date"
              />
            </div>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-muted-foreground mb-2">Description</Label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              placeholder="Enter project description"
              data-testid="textarea-project-description"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Project Type</Label>
              <Select
                value={formData.projectType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectType: value }))}
              >
                <SelectTrigger className="w-full" data-testid="select-project-type">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Road" data-testid="option-road">Road</SelectItem>
                  <SelectItem value="Building" data-testid="option-building">Building</SelectItem>
                  <SelectItem value="Infrastructure" data-testid="option-infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="Bridge" data-testid="option-bridge">Bridge</SelectItem>
                  <SelectItem value="Other" data-testid="option-other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-full" data-testid="select-project-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active" data-testid="option-active">Active</SelectItem>
                  <SelectItem value="Completed" data-testid="option-completed">Completed</SelectItem>
                  <SelectItem value="On Hold" data-testid="option-on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Total Budget ($)</Label>
              <Input
                type="number"
                name="totalBudget"
                value={formData.totalBudget}
                onChange={handleChange}
                step="0.01"
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Enter total budget"
                data-testid="input-total-budget"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-muted-foreground mb-2">Spent Amount ($)</Label>
              <Input
                type="number"
                name="spentAmount"
                value={formData.spentAmount}
                onChange={handleChange}
                step="0.01"
                className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Enter spent amount"
                data-testid="input-spent-amount"
              />
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
              data-testid="button-submit-project"
            >
              {mutation.isPending ? "Saving..." : project ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
