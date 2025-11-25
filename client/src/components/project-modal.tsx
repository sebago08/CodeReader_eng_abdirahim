import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
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
        description: `Failed to ${project ? "update" : "create"} project`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
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
