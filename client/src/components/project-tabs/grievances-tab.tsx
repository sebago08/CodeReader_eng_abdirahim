import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, MessageSquare, Loader2, Eye, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { insertGrievanceSchema } from "@shared/schema";
import type { Grievance, Project } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

interface GrievancesTabProps {
  projectId: string;
  project?: Project;
}

const formSchema = insertGrievanceSchema.extend({
  description: z.string().min(1, "Description is required"),
});

type GrievanceFormValues = z.infer<typeof formSchema>;

export default function GrievancesTab({ projectId, project }: GrievancesTabProps) {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingGrievance, setEditingGrievance] = useState<Grievance | null>(null);
  const [viewingGrievance, setViewingGrievance] = useState<Grievance | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: grievancesList = [], isLoading } = useQuery<Grievance[]>({
    queryKey: ['/api/projects', projectId, 'grievances'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/grievances`);
      if (!response.ok) throw new Error('Failed to fetch grievances');
      return response.json();
    },
  });

  const form = useForm<GrievanceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateReceived: new Date(),
      source: "walk-in",
      complainantName: "",
      isAnonymous: false,
      contactPhone: "",
      contactEmail: "",
      contactAddress: "",
      gender: undefined,
      location: "",
      district: "",
      category: "other",
      subcategory: "",
      description: "",
      status: "registered",
      priority: "medium",
      assignedTo: "",
      assignedDate: undefined,
      acknowledgementDate: undefined,
      targetResolutionDate: undefined,
      resolutionDescription: "",
      dateResolved: undefined,
      satisfactionLevel: undefined,
      feedbackDate: undefined,
      feedbackComments: "",
      isEscalated: false,
      escalatedTo: "",
      escalationDate: undefined,
      escalationReason: "",
      isAppealed: false,
      appealDate: undefined,
      appealOutcome: "",
      internalNotes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GrievanceFormValues) => {
      await apiRequest("POST", `/api/projects/${projectId}/grievances`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'grievances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Grievance recorded successfully",
      });
      handleCloseForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create grievance",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GrievanceFormValues> }) => {
      await apiRequest("PATCH", `/api/grievances/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'grievances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Grievance updated successfully",
      });
      handleCloseForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update grievance",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/grievances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'grievances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Success",
        description: "Grievance deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete grievance",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: GrievanceFormValues) => {
    if (editingGrievance) {
      updateMutation.mutate({ id: editingGrievance.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (grievance: Grievance) => {
    setEditingGrievance(grievance);
    form.reset({
      dateReceived: new Date(grievance.dateReceived),
      source: grievance.source as any,
      complainantName: grievance.complainantName ?? "",
      isAnonymous: grievance.isAnonymous ?? false,
      contactPhone: grievance.contactPhone ?? "",
      contactEmail: grievance.contactEmail ?? "",
      contactAddress: grievance.contactAddress ?? "",
      gender: grievance.gender as any,
      location: grievance.location ?? "",
      district: grievance.district ?? "",
      category: grievance.category as any,
      subcategory: grievance.subcategory ?? "",
      description: grievance.description,
      status: grievance.status as any,
      priority: grievance.priority as any,
      assignedTo: grievance.assignedTo ?? "",
      assignedDate: grievance.assignedDate ? new Date(grievance.assignedDate) : undefined,
      acknowledgementDate: grievance.acknowledgementDate ? new Date(grievance.acknowledgementDate) : undefined,
      targetResolutionDate: grievance.targetResolutionDate ? new Date(grievance.targetResolutionDate) : undefined,
      resolutionDescription: grievance.resolutionDescription ?? "",
      dateResolved: grievance.dateResolved ? new Date(grievance.dateResolved) : undefined,
      satisfactionLevel: grievance.satisfactionLevel as any,
      feedbackDate: grievance.feedbackDate ? new Date(grievance.feedbackDate) : undefined,
      feedbackComments: grievance.feedbackComments ?? "",
      isEscalated: grievance.isEscalated ?? false,
      escalatedTo: grievance.escalatedTo ?? "",
      escalationDate: grievance.escalationDate ? new Date(grievance.escalationDate) : undefined,
      escalationReason: grievance.escalationReason ?? "",
      isAppealed: grievance.isAppealed ?? false,
      appealDate: grievance.appealDate ? new Date(grievance.appealDate) : undefined,
      appealOutcome: grievance.appealOutcome ?? "",
      internalNotes: grievance.internalNotes ?? "",
    });
    setIsFormOpen(true);
  };

  const handleView = (grievance: Grievance) => {
    setViewingGrievance(grievance);
    setIsViewOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGrievance(null);
    form.reset({
      dateReceived: new Date(),
      source: "walk-in",
      complainantName: "",
      isAnonymous: false,
      contactPhone: "",
      contactEmail: "",
      contactAddress: "",
      gender: undefined,
      location: "",
      district: "",
      category: "other",
      subcategory: "",
      description: "",
      status: "registered",
      priority: "medium",
      assignedTo: "",
      assignedDate: undefined,
      acknowledgementDate: undefined,
      targetResolutionDate: undefined,
      resolutionDescription: "",
      dateResolved: undefined,
      satisfactionLevel: undefined,
      feedbackDate: undefined,
      feedbackComments: "",
      isEscalated: false,
      escalatedTo: "",
      escalationDate: undefined,
      escalationReason: "",
      isAppealed: false,
      appealDate: undefined,
      appealOutcome: "",
      internalNotes: "",
    });
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "compensation": return "bg-green-950/20 text-green-400";
      case "resettlement": return "bg-blue-950/20 text-blue-400";
      case "employment": return "bg-purple-950/20 text-purple-400";
      case "environment": return "bg-emerald-950/20 text-emerald-400";
      case "safety": return "bg-red-950/20 text-red-400";
      case "noise_dust": return "bg-orange-950/20 text-orange-400";
      case "property_damage": return "bg-yellow-950/20 text-yellow-400";
      case "access": return "bg-indigo-950/20 text-indigo-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "registered": return "bg-blue-950/20 text-blue-400";
      case "acknowledged": return "bg-cyan-950/20 text-cyan-400";
      case "under_investigation": return "bg-yellow-950/20 text-yellow-400";
      case "resolved": return "bg-green-950/20 text-green-400";
      case "escalated": return "bg-red-950/20 text-red-400";
      case "closed": return "bg-muted text-muted-foreground";
      case "appealed": return "bg-purple-950/20 text-purple-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-950/20 text-red-400";
      case "high": return "bg-orange-950/20 text-orange-400";
      case "medium": return "bg-yellow-950/20 text-yellow-400";
      case "low": return "bg-green-950/20 text-green-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatCategoryLabel = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredGrievances = grievancesList.filter(g => {
    if (categoryFilter !== "all" && g.category !== categoryFilter) return false;
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Grievance Redress Mechanism
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Record and track community grievances in compliance with World Bank GRM requirements
            </CardDescription>
          </div>
          <Button 
            onClick={() => setIsFormOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-new-grievance"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Grievance
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="compensation">Compensation</SelectItem>
                  <SelectItem value="resettlement">Resettlement</SelectItem>
                  <SelectItem value="employment">Employment</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="noise_dust">Noise/Dust</SelectItem>
                  <SelectItem value="property_damage">Property Damage</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="under_investigation">Under Investigation</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="appealed">Appealed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredGrievances.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No Grievances Found</p>
              <Button 
                onClick={() => setIsFormOpen(true)} 
                variant="outline"
                data-testid="button-add-first-grievance"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record First Grievance
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Ref #</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Complainant</TableHead>
                    <TableHead className="text-muted-foreground">Category</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Priority</TableHead>
                    <TableHead className="text-muted-foreground">Assigned To</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrievances.map((grievance) => (
                    <TableRow 
                      key={grievance.id} 
                      className="border-border hover:bg-muted/50"
                      data-testid={`row-grievance-${grievance.id}`}
                    >
                      <TableCell className="font-medium text-foreground">
                        {grievance.grievanceNumber || '-'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {format(new Date(grievance.dateReceived), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {grievance.isAnonymous ? (
                          <span className="text-muted-foreground italic">Anonymous</span>
                        ) : (
                          grievance.complainantName || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadgeColor(grievance.category)}>
                          {formatCategoryLabel(grievance.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(grievance.status)}>
                          {formatStatusLabel(grievance.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadgeColor(grievance.priority || 'medium')}>
                          {(grievance.priority || 'medium').charAt(0).toUpperCase() + (grievance.priority || 'medium').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {grievance.assignedTo || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(grievance)}
                            className="text-blue-400 hover:text-blue-300"
                            data-testid={`button-view-grievance-${grievance.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(grievance)}
                            className="text-muted-foreground hover:text-foreground"
                            data-testid={`button-edit-grievance-${grievance.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(grievance.id)}
                            className="text-red-400 hover:text-red-300"
                            data-testid={`button-delete-grievance-${grievance.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingGrievance ? "Edit Grievance" : "Record New Grievance"}
            </DialogTitle>
            <DialogDescription>
              {editingGrievance 
                ? "Update the grievance details below"
                : "Record a new community grievance following World Bank GRM requirements"
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Complainant Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Complainant Information</h3>
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="isAnonymous"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Anonymous Complaint</FormLabel>
                          <FormDescription>
                            Check if complainant wishes to remain anonymous
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!form.watch("isAnonymous") && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="complainantName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complainant Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} value={field.value ?? ""} data-testid="input-complainant-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-gender">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 234 567 8900" {...field} value={field.value ?? ""} data-testid="input-contact-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" {...field} value={field.value ?? ""} data-testid="input-contact-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactAddress"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Full address" {...field} value={field.value ?? ""} data-testid="input-contact-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Grievance Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Grievance Details</h3>
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateReceived"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Received *</FormLabel>
                          <FormControl>
                            <Input 
                              type="datetime-local" 
                              {...field} 
                              value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                              data-testid="input-date-received"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source/Channel *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-source">
                                <SelectValue placeholder="How was grievance received?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="walk-in">Walk-in</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="letter">Letter</SelectItem>
                              <SelectItem value="community_meeting">Community Meeting</SelectItem>
                              <SelectItem value="suggestion_box">Suggestion Box</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location/Village</FormLabel>
                          <FormControl>
                            <Input placeholder="Where did the issue occur?" {...field} value={field.value ?? ""} data-testid="input-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District</FormLabel>
                          <FormControl>
                            <Input placeholder="District name" {...field} value={field.value ?? ""} data-testid="input-district" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="compensation">Compensation</SelectItem>
                              <SelectItem value="resettlement">Resettlement</SelectItem>
                              <SelectItem value="employment">Employment</SelectItem>
                              <SelectItem value="environment">Environment</SelectItem>
                              <SelectItem value="safety">Safety</SelectItem>
                              <SelectItem value="noise_dust">Noise/Dust</SelectItem>
                              <SelectItem value="property_damage">Property Damage</SelectItem>
                              <SelectItem value="access">Access</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <FormControl>
                            <Input placeholder="More specific category" {...field} value={field.value ?? ""} data-testid="input-subcategory" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description of Grievance *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the grievance in detail..." 
                            className="min-h-[120px]"
                            {...field} 
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status and Assignment */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Status & Assignment</h3>
                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="registered">Registered</SelectItem>
                              <SelectItem value="acknowledged">Acknowledged</SelectItem>
                              <SelectItem value="under_investigation">Under Investigation</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="escalated">Escalated</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="appealed">Appealed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "medium"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <FormControl>
                            <Input placeholder="Person responsible" {...field} value={field.value ?? ""} data-testid="input-assigned-to" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="acknowledgementDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acknowledgement Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              data-testid="input-acknowledgement-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetResolutionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Resolution Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              data-testid="input-target-resolution-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Resolution */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Resolution</h3>
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateResolved"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Resolved</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              data-testid="input-date-resolved"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="satisfactionLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complainant Satisfaction</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-satisfaction">
                                <SelectValue placeholder="Select satisfaction level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="satisfied">Satisfied</SelectItem>
                              <SelectItem value="partially_satisfied">Partially Satisfied</SelectItem>
                              <SelectItem value="not_satisfied">Not Satisfied</SelectItem>
                              <SelectItem value="no_response">No Response</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="resolutionDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resolution Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe how the grievance was resolved..." 
                            className="min-h-[80px]"
                            {...field} 
                            value={field.value ?? ""}
                            data-testid="input-resolution-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Internal Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Internal Notes</h3>
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Internal Use Only)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add internal notes..." 
                            className="min-h-[80px]"
                            {...field} 
                            value={field.value ?? ""}
                            data-testid="input-internal-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseForm} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-grievance"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingGrievance ? "Update Grievance" : "Record Grievance"}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Grievance Details
            </DialogTitle>
            <DialogDescription>
              {viewingGrievance?.grievanceNumber || 'Grievance Information'}
            </DialogDescription>
          </DialogHeader>
          
          {viewingGrievance && (
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <div className="space-y-6">
                {/* Complainant Info */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Complainant Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium text-foreground">
                        {viewingGrievance.isAnonymous ? 'Anonymous' : (viewingGrievance.complainantName || '-')}
                      </p>
                    </div>
                    {!viewingGrievance.isAnonymous && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Gender:</span>
                          <p className="font-medium text-foreground">
                            {viewingGrievance.gender ? formatStatusLabel(viewingGrievance.gender) : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium text-foreground">{viewingGrievance.contactPhone || '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium text-foreground">{viewingGrievance.contactEmail || '-'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Grievance Details */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Grievance Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Date Received:</span>
                      <p className="font-medium text-foreground">
                        {format(new Date(viewingGrievance.dateReceived), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source:</span>
                      <p className="font-medium text-foreground">
                        {formatCategoryLabel(viewingGrievance.source)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <Badge className={getCategoryBadgeColor(viewingGrievance.category)}>
                        {formatCategoryLabel(viewingGrievance.category)}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusBadgeColor(viewingGrievance.status)}>
                        {formatStatusLabel(viewingGrievance.status)}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium text-foreground">{viewingGrievance.location || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">District:</span>
                      <p className="font-medium text-foreground">{viewingGrievance.district || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">Description:</span>
                    <p className="font-medium text-foreground mt-1 whitespace-pre-wrap">
                      {viewingGrievance.description}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {/* Assignment & Resolution */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Assignment & Resolution</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Assigned To:</span>
                      <p className="font-medium text-foreground">{viewingGrievance.assignedTo || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge className={getPriorityBadgeColor(viewingGrievance.priority || 'medium')}>
                        {(viewingGrievance.priority || 'medium').charAt(0).toUpperCase() + (viewingGrievance.priority || 'medium').slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target Resolution:</span>
                      <p className="font-medium text-foreground">
                        {viewingGrievance.targetResolutionDate 
                          ? format(new Date(viewingGrievance.targetResolutionDate), 'MMM d, yyyy')
                          : '-'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date Resolved:</span>
                      <p className="font-medium text-foreground">
                        {viewingGrievance.dateResolved 
                          ? format(new Date(viewingGrievance.dateResolved), 'MMM d, yyyy')
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                  {viewingGrievance.resolutionDescription && (
                    <div className="mt-4">
                      <span className="text-muted-foreground text-sm">Resolution:</span>
                      <p className="font-medium text-foreground mt-1 whitespace-pre-wrap">
                        {viewingGrievance.resolutionDescription}
                      </p>
                    </div>
                  )}
                </div>

                {viewingGrievance.satisfactionLevel && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Feedback</h4>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Satisfaction Level:</span>
                        <p className="font-medium text-foreground">
                          {formatStatusLabel(viewingGrievance.satisfactionLevel)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
