import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertSafetyIncidentSchema } from "@shared/schema";
import type { SafetyIncident } from "@shared/schema";
import { z } from "zod";

interface SafetyTabProps {
  projectId: string;
}

type SafetyIncidentFormValues = z.infer<typeof insertSafetyIncidentSchema>;

export default function SafetyTab({ projectId }: SafetyTabProps) {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<SafetyIncident | null>(null);

  const { data: incidents = [], isLoading } = useQuery<SafetyIncident[]>({
    queryKey: [`/api/projects/${projectId}/safety-incidents`],
  });

  const form = useForm<SafetyIncidentFormValues>({
    resolver: zodResolver(insertSafetyIncidentSchema),
    defaultValues: {
      incidentDate: new Date().toISOString().split("T")[0],
      description: "",
      severity: "Low",
      status: "Open",
      reportedBy: "",
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: SafetyIncidentFormValues) => {
      await apiRequest("POST", `/api/projects/${projectId}/safety-incidents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/safety-incidents`] });
      toast({
        title: "Success",
        description: "Safety incident recorded successfully",
      });
      setIsAddModalOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record safety incident",
        variant: "destructive",
      });
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SafetyIncidentFormValues> }) => {
      await apiRequest("PATCH", `/api/safety-incidents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/safety-incidents`] });
      toast({
        title: "Success",
        description: "Safety incident updated successfully",
      });
      setEditingIncident(null);
      setIsAddModalOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update safety incident",
        variant: "destructive",
      });
    },
  });

  const deleteIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/safety-incidents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/safety-incidents`] });
      toast({
        title: "Success",
        description: "Safety incident deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete safety incident",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: SafetyIncidentFormValues) => {
    if (editingIncident) {
      updateIncidentMutation.mutate({ id: editingIncident.id, data });
    } else {
      createIncidentMutation.mutate(data);
    }
  };

  const handleEdit = (incident: SafetyIncident) => {
    setEditingIncident(incident);
    form.reset({
      incidentDate: incident.incidentDate,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      reportedBy: incident.reportedBy || "",
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this safety incident record?")) {
      deleteIncidentMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingIncident(null);
    form.reset();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Low":
        return "bg-green-500";
      case "Medium":
        return "bg-yellow-500";
      case "High":
        return "bg-orange-500";
      case "Critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-red-500";
      case "Under Investigation":
        return "bg-yellow-500";
      case "Resolved":
        return "bg-blue-500";
      case "Closed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Safety Incidents
              </CardTitle>
              <CardDescription>Track and manage safety incidents on this project</CardDescription>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-incident">
              <Plus className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No safety incidents recorded</p>
              <p className="text-sm mt-1">Maintaining a safe work environment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id} data-testid={`incident-row-${incident.id}`}>
                    <TableCell data-testid={`incident-date-${incident.id}`}>
                      {formatDate(incident.incidentDate)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" data-testid={`incident-description-${incident.id}`}>
                      {incident.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getSeverityColor(incident.severity)} text-white`} data-testid={`incident-severity-${incident.id}`}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(incident.status)} text-white`} data-testid={`incident-status-${incident.id}`}>
                        {incident.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`incident-reporter-${incident.id}`}>
                      {incident.reportedBy || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(incident)}
                          data-testid={`button-edit-incident-${incident.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(incident.id)}
                          data-testid={`button-delete-incident-${incident.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Incident Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-semibold text-card-foreground">
                {editingIncident ? "Edit Safety Incident" : "Report Safety Incident"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-close-incident-modal"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                <FormField
                  control={form.control}
                  name="incidentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-incident-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the safety incident in detail..."
                          rows={4}
                          {...field}
                          data-testid="textarea-incident-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-incident-severity">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-incident-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reportedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reported By (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Name of person reporting"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-incident-reporter"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Button
                    type="button"
                    onClick={handleCloseModal}
                    variant="outline"
                    data-testid="button-cancel-incident"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createIncidentMutation.isPending || updateIncidentMutation.isPending}
                    data-testid="button-submit-incident"
                  >
                    {createIncidentMutation.isPending || updateIncidentMutation.isPending
                      ? "Saving..."
                      : editingIncident
                      ? "Update Incident"
                      : "Report Incident"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
