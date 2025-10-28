import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Trash2, Plus, Upload, Image as ImageIcon } from "lucide-react";
import type { ProjectWithRoads, InsertProject, ClientPersonnel, ContractorPersonnel, ContractorEquipment } from "@shared/schema";

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
    executiveSummary: "",
    projectLocation: "",
    scopeOfWork: "",
    clientLogo: "",
    contractorLogo: "",
  });

  // Sub-tab states for Client and Contractor
  const [clientSubTab, setClientSubTab] = useState("details");
  const [contractorSubTab, setContractorSubTab] = useState("details");

  // Client personnel state
  const [newClientPersonnel, setNewClientPersonnel] = useState({ name: "", qualification: "", designation: "" });
  
  // Contractor personnel state
  const [newContractorPersonnel, setNewContractorPersonnel] = useState({ name: "", qualification: "", designation: "" });
  
  // Contractor equipment state
  const [newContractorEquipment, setNewContractorEquipment] = useState({ equipmentName: "", type: "", quantity: "1", condition: "" });

  // File refs for logo uploads
  const clientLogoInputRef = useRef<HTMLInputElement>(null);
  const contractorLogoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingClientLogo, setIsUploadingClientLogo] = useState(false);
  const [isUploadingContractorLogo, setIsUploadingContractorLogo] = useState(false);

  // Fetch personnel and equipment if editing
  const { data: clientPersonnel = [] } = useQuery<ClientPersonnel[]>({
    queryKey: [`/api/projects/${project?.id}/client-personnel`],
    enabled: !!project?.id,
  });

  const { data: contractorPersonnel = [] } = useQuery<ContractorPersonnel[]>({
    queryKey: [`/api/projects/${project?.id}/contractor-personnel`],
    enabled: !!project?.id,
  });

  const { data: contractorEquipment = [] } = useQuery<ContractorEquipment[]>({
    queryKey: [`/api/projects/${project?.id}/contractor-equipment`],
    enabled: !!project?.id,
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
        executiveSummary: project.executiveSummary || "",
        projectLocation: project.projectLocation || "",
        scopeOfWork: project.scopeOfWork || "",
        clientLogo: project.clientLogo || "",
        contractorLogo: project.contractorLogo || "",
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

  // Client personnel mutations
  const addClientPersonnelMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!project?.id) throw new Error("Project ID is required");
      await apiRequest("POST", `/api/projects/${project.id}/client-personnel`, data);
    },
    onSuccess: () => {
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/client-personnel`] });
      }
      setNewClientPersonnel({ name: "", qualification: "", designation: "" });
      toast({ title: "Success", description: "Client personnel added successfully" });
    },
  });

  const deleteClientPersonnelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/client-personnel/${id}`);
    },
    onSuccess: () => {
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/client-personnel`] });
      }
      toast({ title: "Success", description: "Client personnel deleted successfully" });
    },
  });

  // Contractor personnel mutations
  const addContractorPersonnelMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!project?.id) throw new Error("Project ID is required");
      await apiRequest("POST", `/api/projects/${project.id}/contractor-personnel`, data);
    },
    onSuccess: () => {
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/contractor-personnel`] });
      }
      setNewContractorPersonnel({ name: "", qualification: "", designation: "" });
      toast({ title: "Success", description: "Contractor personnel added successfully" });
    },
  });

  const deleteContractorPersonnelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contractor-personnel/${id}`);
    },
    onSuccess: () => {
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/contractor-personnel`] });
      }
      toast({ title: "Success", description: "Contractor personnel deleted successfully" });
    },
  });

  // Contractor equipment mutations
  const addContractorEquipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!project?.id) throw new Error("Project ID is required");
      await apiRequest("POST", `/api/projects/${project.id}/contractor-equipment`, data);
    },
    onSuccess: () => {
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/contractor-equipment`] });
      }
      setNewContractorEquipment({ equipmentName: "", type: "", quantity: "1", condition: "" });
      toast({ title: "Success", description: "Contractor equipment added successfully" });
    },
  });

  const deleteContractorEquipmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contractor-equipment/${id}`);
    },
    onSuccess: () => {
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/contractor-equipment`] });
      }
      toast({ title: "Success", description: "Contractor equipment deleted successfully" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

  const handleLogoUpload = async (file: File, type: 'client' | 'contractor') => {
    if (!project?.id) {
      toast({
        title: "Error",
        description: "Please save the project first before uploading logos",
        variant: "destructive",
      });
      return;
    }

    if (type === 'client') {
      setIsUploadingClientLogo(true);
    } else {
      setIsUploadingContractorLogo(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const path = `${project.id}/${type}-logo-${Date.now()}.${file.name.split('.').pop()}`;
      
      const response = await fetch(`/api/storage/project-logos/${path}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();

      // Update project with logo URL
      const updateData = type === 'client' ? { clientLogo: url } : { contractorLogo: url };
      await apiRequest("PATCH", `/api/projects/${project.id}`, updateData);

      setFormData(prev => ({
        ...prev,
        [type === 'client' ? 'clientLogo' : 'contractorLogo']: url,
      }));

      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      toast({
        title: "Success",
        description: `${type === 'client' ? 'Client' : 'Contractor'} logo uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      if (type === 'client') {
        setIsUploadingClientLogo(false);
      } else {
        setIsUploadingContractorLogo(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
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
                Introduction
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="p-6 space-y-6 min-h-[500px]">
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

            {/* Client Tab with nested tabs */}
            <TabsContent value="client" className="p-0 min-h-[500px]">
              <div className="flex items-center gap-1 px-6 pt-4 border-b border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setClientSubTab("details")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    clientSubTab === "details"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="button-client-details-tab"
                >
                  Client Details
                </button>
                <button
                  type="button"
                  onClick={() => setClientSubTab("personnel")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    clientSubTab === "personnel"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="button-client-personnel-tab"
                >
                  Personnel
                </button>
              </div>

              {clientSubTab === "details" && (
                <div className="p-6 space-y-6">
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

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Client Logo</Label>
                    <input
                      ref={clientLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, 'client');
                      }}
                      data-testid="input-client-logo"
                    />
                    <div className="flex items-center gap-4">
                      {formData.clientLogo ? (
                        <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden">
                          <img
                            src={formData.clientLogo}
                            alt="Client logo"
                            className="w-full h-full object-contain"
                            data-testid="img-client-logo"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => clientLogoInputRef.current?.click()}
                          disabled={isUploadingClientLogo || !project}
                          data-testid="button-upload-client-logo"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploadingClientLogo ? "Uploading..." : formData.clientLogo ? "Change Logo" : "Upload Logo"}
                        </Button>
                        {!project && (
                          <p className="text-xs text-gray-500">Save project first to upload logo</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {clientSubTab === "personnel" && (
                <div className="p-6 space-y-6">
                  {!project && (
                    <div className="text-center py-8 text-gray-500">
                      Please save the project first before adding personnel
                    </div>
                  )}
                  {project && (
                    <>
                  <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Qualification</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Designation</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientPersonnel.map((person) => (
                          <tr key={person.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{person.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{person.qualification}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{person.designation}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => deleteClientPersonnelMutation.mutate(person.id)}
                                className="text-red-600 hover:text-red-800"
                                data-testid={`button-delete-client-personnel-${person.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={newClientPersonnel.name}
                        onChange={(e) => setNewClientPersonnel(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-new-client-personnel-name"
                      />
                      <Input
                        type="text"
                        placeholder="e.g., MBA, PMP"
                        value={newClientPersonnel.qualification}
                        onChange={(e) => setNewClientPersonnel(prev => ({ ...prev, qualification: e.target.value }))}
                        data-testid="input-new-client-personnel-qualification"
                      />
                      <Input
                        type="text"
                        placeholder="e.g., Project Director"
                        value={newClientPersonnel.designation}
                        onChange={(e) => setNewClientPersonnel(prev => ({ ...prev, designation: e.target.value }))}
                        data-testid="input-new-client-personnel-designation"
                      />
                      <Button
                        type="button"
                        onClick={() => addClientPersonnelMutation.mutate(newClientPersonnel)}
                        disabled={!newClientPersonnel.name}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                        data-testid="button-add-client-personnel"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Personnel
                      </Button>
                    </div>
                  </div>
                  </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Contractor Tab with nested tabs */}
            <TabsContent value="contractor" className="p-0 min-h-[500px]">
              <div className="flex items-center gap-1 px-6 pt-4 border-b border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setContractorSubTab("details")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    contractorSubTab === "details"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="button-contractor-details-tab"
                >
                  Contractor Details
                </button>
                <button
                  type="button"
                  onClick={() => setContractorSubTab("personnel")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    contractorSubTab === "personnel"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="button-contractor-personnel-tab"
                >
                  Personnel
                </button>
                <button
                  type="button"
                  onClick={() => setContractorSubTab("equipment")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    contractorSubTab === "equipment"
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="button-contractor-equipment-tab"
                >
                  Equipment
                </button>
              </div>

              {contractorSubTab === "details" && (
                <div className="p-6 space-y-6">
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

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Contractor Logo</Label>
                    <input
                      ref={contractorLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, 'contractor');
                      }}
                      data-testid="input-contractor-logo"
                    />
                    <div className="flex items-center gap-4">
                      {formData.contractorLogo ? (
                        <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden">
                          <img
                            src={formData.contractorLogo}
                            alt="Contractor logo"
                            className="w-full h-full object-contain"
                            data-testid="img-contractor-logo"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => contractorLogoInputRef.current?.click()}
                          disabled={isUploadingContractorLogo || !project}
                          data-testid="button-upload-contractor-logo"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploadingContractorLogo ? "Uploading..." : formData.contractorLogo ? "Change Logo" : "Upload Logo"}
                        </Button>
                        {!project && (
                          <p className="text-xs text-gray-500">Save project first to upload logo</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {contractorSubTab === "personnel" && (
                <div className="p-6 space-y-6">
                  {!project && (
                    <div className="text-center py-8 text-gray-500">
                      Please save the project first before adding personnel
                    </div>
                  )}
                  {project && (
                    <>
                  <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Qualification</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Designation</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contractorPersonnel.map((person) => (
                          <tr key={person.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{person.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{person.qualification}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{person.designation}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => deleteContractorPersonnelMutation.mutate(person.id)}
                                className="text-red-600 hover:text-red-800"
                                data-testid={`button-delete-contractor-personnel-${person.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={newContractorPersonnel.name}
                        onChange={(e) => setNewContractorPersonnel(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-new-contractor-personnel-name"
                      />
                      <Input
                        type="text"
                        placeholder="e.g., B.Eng Civil"
                        value={newContractorPersonnel.qualification}
                        onChange={(e) => setNewContractorPersonnel(prev => ({ ...prev, qualification: e.target.value }))}
                        data-testid="input-new-contractor-personnel-qualification"
                      />
                      <Input
                        type="text"
                        placeholder="e.g., Site Engineer"
                        value={newContractorPersonnel.designation}
                        onChange={(e) => setNewContractorPersonnel(prev => ({ ...prev, designation: e.target.value }))}
                        data-testid="input-new-contractor-personnel-designation"
                      />
                      <Button
                        type="button"
                        onClick={() => addContractorPersonnelMutation.mutate(newContractorPersonnel)}
                        disabled={!newContractorPersonnel.name}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                        data-testid="button-add-contractor-personnel"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Personnel
                      </Button>
                    </div>
                  </div>
                  </>
                  )}
                </div>
              )}

              {contractorSubTab === "equipment" && (
                <div className="p-6 space-y-6">
                  {!project && (
                    <div className="text-center py-8 text-gray-500">
                      Please save the project first before adding equipment
                    </div>
                  )}
                  {project && (
                    <>
                    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Equipment Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Condition</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contractorEquipment.map((equipment) => (
                          <tr key={equipment.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{equipment.equipmentName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{equipment.type}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{equipment.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{equipment.condition}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => deleteContractorEquipmentMutation.mutate(equipment.id)}
                                className="text-red-600 hover:text-red-800"
                                data-testid={`button-delete-contractor-equipment-${equipment.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <Input
                        type="text"
                        placeholder="e.g., Excavator"
                        value={newContractorEquipment.equipmentName}
                        onChange={(e) => setNewContractorEquipment(prev => ({ ...prev, equipmentName: e.target.value }))}
                        data-testid="input-new-contractor-equipment-name"
                      />
                      <Input
                        type="text"
                        placeholder="e.g., Heavy machinery"
                        value={newContractorEquipment.type}
                        onChange={(e) => setNewContractorEquipment(prev => ({ ...prev, type: e.target.value }))}
                        data-testid="input-new-contractor-equipment-type"
                      />
                      <Input
                        type="number"
                        placeholder="1"
                        value={newContractorEquipment.quantity}
                        onChange={(e) => setNewContractorEquipment(prev => ({ ...prev, quantity: e.target.value }))}
                        data-testid="input-new-contractor-equipment-quantity"
                      />
                      <Select
                        value={newContractorEquipment.condition}
                        onValueChange={(value) => setNewContractorEquipment(prev => ({ ...prev, condition: value }))}
                      >
                        <SelectTrigger data-testid="select-new-contractor-equipment-condition">
                          <SelectValue placeholder="e.g., Good" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Excellent">Excellent</SelectItem>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={() => addContractorEquipmentMutation.mutate({
                          equipmentName: newContractorEquipment.equipmentName,
                          type: newContractorEquipment.type,
                          quantity: parseInt(newContractorEquipment.quantity),
                          condition: newContractorEquipment.condition,
                        })}
                        disabled={!newContractorEquipment.equipmentName}
                        className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                        data-testid="button-add-contractor-equipment"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Equipment
                      </Button>
                    </div>
                  </div>
                  </>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Introduction Tab */}
            <TabsContent value="scope" className="p-6 space-y-6 min-h-[500px]">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Executive Summary</Label>
                <Textarea
                  name="executiveSummary"
                  value={formData.executiveSummary}
                  onChange={handleChange}
                  rows={4}
                  className="w-full"
                  placeholder="Enter executive summary for the project..."
                  data-testid="textarea-executive-summary"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Location</Label>
                <Textarea
                  name="projectLocation"
                  value={formData.projectLocation}
                  onChange={handleChange}
                  rows={4}
                  className="w-full"
                  placeholder="Enter detailed location description..."
                  data-testid="textarea-project-location"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Scope of Work</Label>
                <Textarea
                  name="scopeOfWork"
                  value={formData.scopeOfWork}
                  onChange={handleChange}
                  rows={6}
                  className="w-full"
                  placeholder="Enter detailed scope of work..."
                  data-testid="textarea-scope-of-work"
                />
              </div>
            </TabsContent>
          </Tabs>

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
