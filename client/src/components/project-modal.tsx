import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X } from "lucide-react";
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
    projectNumber: "",
    client: "",
    location: "",
    startDate: "",
    endDate: "",
    duration: "",
    description: "",
    projectType: "Road",
    status: "Active",
    totalBudget: "",
    spentAmount: "",
    contractAmount: "",
    defectsLiabilityPeriod: "",
    clientContactPerson: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    contractorName: "",
    contractorContactPerson: "",
    contractorEmail: "",
    contractorPhone: "",
    scopeOfWork: "",
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        projectNumber: project.projectNumber || "",
        client: project.client || "",
        location: project.location || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        duration: project.duration?.toString() || "",
        description: project.description || "",
        projectType: project.projectType || "Road",
        status: project.status || "Active",
        totalBudget: project.totalBudget || "",
        spentAmount: project.spentAmount || "",
        contractAmount: project.contractAmount || "",
        defectsLiabilityPeriod: project.defectsLiabilityPeriod?.toString() || "",
        clientContactPerson: project.clientContactPerson || "",
        clientEmail: project.clientEmail || "",
        clientPhone: project.clientPhone || "",
        clientAddress: project.clientAddress || "",
        contractorName: project.contractorName || "",
        contractorContactPerson: project.contractorContactPerson || "",
        contractorEmail: project.contractorEmail || "",
        contractorPhone: project.contractorPhone || "",
        scopeOfWork: project.scopeOfWork || "",
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
      contractAmount: formData.contractAmount === "" ? undefined : formData.contractAmount,
      duration: formData.duration === "" ? undefined : parseInt(formData.duration),
      defectsLiabilityPeriod: formData.defectsLiabilityPeriod === "" ? undefined : parseInt(formData.defectsLiabilityPeriod),
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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {project ? "Edit Project" : "Add New Project"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-white px-6">
              <TabsTrigger value="basic" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0EA5E9] rounded-none">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="client" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0EA5E9] rounded-none">
                Client
              </TabsTrigger>
              <TabsTrigger value="contractor" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0EA5E9] rounded-none">
                Contractor
              </TabsTrigger>
              <TabsTrigger value="scope" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0EA5E9] rounded-none">
                Project Scope
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</Label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Enter project name"
                    required
                    data-testid="input-project-name"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Project Number</Label>
                  <Input
                    type="text"
                    name="projectNumber"
                    value={formData.projectNumber}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="e.g., RFC-2023-001"
                    data-testid="input-project-number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Location *</Label>
                  <Input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Enter location"
                    required
                    data-testid="input-project-location"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Contract Amount ($)</Label>
                  <Input
                    type="number"
                    name="contractAmount"
                    value={formData.contractAmount}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full"
                    placeholder="Enter contract amount"
                    data-testid="input-contract-amount"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Project Description</Label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full"
                  placeholder="Enter project description"
                  data-testid="textarea-project-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</Label>
                  <Input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full"
                    required
                    data-testid="input-project-start-date"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Duration (Months)</Label>
                  <Input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="e.g., 6"
                    data-testid="input-duration"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Expected Completion *</Label>
                  <Input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full"
                    required
                    data-testid="input-project-end-date"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Defects Liability Period (Months)</Label>
                  <Input
                    type="number"
                    name="defectsLiabilityPeriod"
                    value={formData.defectsLiabilityPeriod}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="e.g., 12"
                    data-testid="input-defects-liability"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Project Type</Label>
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
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Status</Label>
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
            </TabsContent>

            {/* Client Tab */}
            <TabsContent value="client" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</Label>
                  <Input
                    type="text"
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Enter client name"
                    required
                    data-testid="input-project-client"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</Label>
                  <Input
                    type="text"
                    name="clientContactPerson"
                    value={formData.clientContactPerson}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Enter contact person"
                    data-testid="input-client-contact"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Email</Label>
                  <Input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="client@example.com"
                    data-testid="input-client-email"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Phone</Label>
                  <Input
                    type="tel"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="+1 (555) 123-4567"
                    data-testid="input-client-phone"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Address</Label>
                <Textarea
                  name="clientAddress"
                  value={formData.clientAddress}
                  onChange={handleChange}
                  rows={3}
                  className="w-full"
                  placeholder="Enter client address"
                  data-testid="textarea-client-address"
                />
              </div>
            </TabsContent>

            {/* Contractor Tab */}
            <TabsContent value="contractor" className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Contractor Name</Label>
                  <Input
                    type="text"
                    name="contractorName"
                    value={formData.contractorName}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Enter contractor name"
                    data-testid="input-contractor-name"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</Label>
                  <Input
                    type="text"
                    name="contractorContactPerson"
                    value={formData.contractorContactPerson}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="Enter contact person"
                    data-testid="input-contractor-contact"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Email</Label>
                  <Input
                    type="email"
                    name="contractorEmail"
                    value={formData.contractorEmail}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="contractor@example.com"
                    data-testid="input-contractor-email"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">Phone</Label>
                  <Input
                    type="tel"
                    name="contractorPhone"
                    value={formData.contractorPhone}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="+1 (555) 123-4567"
                    data-testid="input-contractor-phone"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Project Scope Tab */}
            <TabsContent value="scope" className="p-6 space-y-6">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Scope of Work</Label>
                <Textarea
                  name="scopeOfWork"
                  value={formData.scopeOfWork}
                  onChange={handleChange}
                  rows={10}
                  className="w-full"
                  placeholder="Enter detailed scope of work..."
                  data-testid="textarea-scope-of-work"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-end space-x-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-6"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
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
