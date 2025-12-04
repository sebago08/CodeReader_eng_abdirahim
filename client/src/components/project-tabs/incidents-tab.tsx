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
import { Plus, Edit, Trash2, AlertTriangle, Loader2, Eye, FileText, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { insertIncidentReportSchema } from "@shared/schema";
import type { IncidentReport, Project } from "@shared/schema";
import { z } from "zod";

interface IncidentsTabProps {
  projectId: string;
  project?: Project;
}

const formSchema = insertIncidentReportSchema.extend({
  incidentTitle: z.string().min(1, "Incident title is required"),
  incidentDescription: z.string().min(1, "Incident description is required"),
});

type IncidentFormValues = z.infer<typeof formSchema>;

export default function IncidentsTab({ projectId, project }: IncidentsTabProps) {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<IncidentReport | null>(null);
  const [viewingReport, setViewingReport] = useState<IncidentReport | null>(null);
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reports = [], isLoading } = useQuery<IncidentReport[]>({
    queryKey: ['/api/projects', projectId, 'incident-reports'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/incident-reports`);
      if (!response.ok) throw new Error('Failed to fetch incident reports');
      return response.json();
    },
  });

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      incidentTitle: "",
      incidentDescription: "",
      classification: "indicative",
      status: "draft",
      country: project?.location?.split(',')[1]?.trim() || "",
      state: project?.location?.split(',')[0]?.trim() || "",
      incidentLocation: "",
      projectEngineer: "",
      projectManager: "",
      safeguardsOfficer: "",
      reportedBy: "",
      incidentDateTime: new Date(),
      discoveredDateTime: null,
      discoveryMethod: "",
      whatHappened: "",
      factsAreUncontested: true,
      conflictingVersions: "",
      conditions: "",
      isOngoing: false,
      isContained: false,
      involvesLossOfLife: false,
      involvesSevereHarm: false,
      measuresImplemented: "",
      agenciesInformed: "",
      agenciesResponse: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: IncidentFormValues) => {
      await apiRequest("POST", `/api/projects/${projectId}/incident-reports`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'incident-reports'] });
      toast({
        title: "Success",
        description: "Incident report created successfully",
      });
      handleCloseForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create incident report",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IncidentFormValues> }) => {
      await apiRequest("PATCH", `/api/incident-reports/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'incident-reports'] });
      toast({
        title: "Success",
        description: "Incident report updated successfully",
      });
      handleCloseForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update incident report",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/incident-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'incident-reports'] });
      toast({
        title: "Success",
        description: "Incident report deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete incident report",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: IncidentFormValues) => {
    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (report: IncidentReport) => {
    setEditingReport(report);
    form.reset({
      incidentTitle: report.incidentTitle,
      incidentDescription: report.incidentDescription,
      classification: report.classification as "indicative" | "serious" | "severe",
      status: report.status as "draft" | "submitted" | "under_review" | "closed",
      country: report.country || "",
      state: report.state || "",
      incidentLocation: report.incidentLocation || "",
      projectEngineer: report.projectEngineer || "",
      projectManager: report.projectManager || "",
      safeguardsOfficer: report.safeguardsOfficer || "",
      reportedBy: report.reportedBy || "",
      incidentDateTime: new Date(report.incidentDateTime),
      discoveredDateTime: report.discoveredDateTime ? new Date(report.discoveredDateTime) : null,
      discoveryMethod: report.discoveryMethod || "",
      whatHappened: report.whatHappened || "",
      factsAreUncontested: report.factsAreUncontested ?? true,
      conflictingVersions: report.conflictingVersions || "",
      conditions: report.conditions || "",
      isOngoing: report.isOngoing ?? false,
      isContained: report.isContained ?? false,
      involvesLossOfLife: report.involvesLossOfLife ?? false,
      involvesSevereHarm: report.involvesSevereHarm ?? false,
      measuresImplemented: report.measuresImplemented || "",
      agenciesInformed: report.agenciesInformed || "",
      agenciesResponse: report.agenciesResponse || "",
    });
    setIsFormOpen(true);
  };

  const handleView = (report: IncidentReport) => {
    setViewingReport(report);
    setIsViewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this incident report?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingReport(null);
    form.reset();
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "indicative":
        return "bg-blue-500";
      case "serious":
        return "bg-orange-500";
      case "severe":
        return "bg-red-600";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "submitted":
        return "bg-blue-500";
      case "under_review":
        return "bg-yellow-500";
      case "closed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredReports = reports.filter((report) => {
    if (classificationFilter !== "all" && report.classification !== classificationFilter) {
      return false;
    }
    if (statusFilter !== "all" && report.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const severeCount = reports.filter(r => r.classification === 'severe' && r.status !== 'closed').length;
  const seriousCount = reports.filter(r => r.classification === 'serious' && r.status !== 'closed').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(severeCount > 0 || seriousCount > 0) && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">
                Active Critical Incidents
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                {severeCount > 0 && `${severeCount} severe`}
                {severeCount > 0 && seriousCount > 0 && " and "}
                {seriousCount > 0 && `${seriousCount} serious`}
                {" incident(s) require attention"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Incident Reports</CardTitle>
                <CardDescription>
                  World Bank-compliant incident/accident reporting
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-add-incident"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Incident Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-classification-filter">
                <SelectValue placeholder="Filter by classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="indicative">Indicative</SelectItem>
                <SelectItem value="serious">Serious</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Incident Reports</h3>
              <p className="text-muted-foreground mb-4">
                {reports.length === 0
                  ? "No incident reports have been filed for this project yet."
                  : "No reports match your current filters."}
              </p>
              {reports.length === 0 && (
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Report
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} data-testid={`row-incident-${report.id}`}>
                    <TableCell>{formatDateTime(report.incidentDateTime)}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {report.incidentTitle}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getClassificationColor(report.classification)} text-white`}>
                        {report.classification.charAt(0).toUpperCase() + report.classification.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(report.status)} text-white`}>
                        {report.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell>{report.reportedBy || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(report)}
                          data-testid={`button-view-incident-${report.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(report)}
                          data-testid={`button-edit-incident-${report.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(report.id)}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`button-delete-incident-${report.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingReport ? "Edit Incident Report" : "New Incident Report"}
            </DialogTitle>
            <DialogDescription>
              World Bank-compliant incident/accident report form
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>1. Country</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Enter country" data-testid="input-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Region</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Enter state/region" data-testid="input-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <FormLabel className="text-sm text-muted-foreground">2. Name of the Project</FormLabel>
                  <p className="font-medium">{project?.name || "Current Project"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectEngineer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>3. Project Engineer/Manager</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Name of Project Engineer/Manager" data-testid="input-project-engineer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safeguardsOfficer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Environmental & Social Safeguards Officer</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Name of Safeguards Officer" data-testid="input-safeguards-officer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="classification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>4. Preliminary Classification of the Incident</FormLabel>
                      <div className="flex gap-4 mt-2">
                        {["indicative", "serious", "severe"].map((classification) => (
                          <label
                            key={classification}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                              field.value === classification
                                ? classification === "severe"
                                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                                  : classification === "serious"
                                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                  : "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                : "border-muted hover:border-muted-foreground/50"
                            }`}
                          >
                            <input
                              type="radio"
                              value={classification}
                              checked={field.value === classification}
                              onChange={() => field.onChange(classification)}
                              className="sr-only"
                              data-testid={`radio-classification-${classification}`}
                            />
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                field.value === classification
                                  ? `${getClassificationColor(classification)} border-transparent`
                                  : "border-muted-foreground"
                              }`}
                            >
                              {field.value === classification && (
                                <div className="w-full h-full rounded-full bg-white/50" />
                              )}
                            </div>
                            <span className="capitalize font-medium">{classification}</span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incidentTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>5. What is the incident? (Brief Title)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Brief title of the incident" data-testid="input-incident-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incidentDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>6. What actually happened? To what or to whom?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Describe what happened in detail..."
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
                    name="incidentLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>7. Where did the incident occur?</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Specific location" data-testid="input-incident-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="incidentDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When did the incident occur?</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-incident-datetime"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discoveryMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>8. How did we find out about it?</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Method of discovery" data-testid="input-discovery-method" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discoveredDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When was it discovered?</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                            data-testid="input-discovery-datetime"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="factsAreUncontested"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>9. Are the basic facts of the incident clear and uncontested?</FormLabel>
                        <FormDescription>
                          Toggle off if there are conflicting versions
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          data-testid="switch-facts-uncontested"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!form.watch("factsAreUncontested") && (
                  <FormField
                    control={form.control}
                    name="conflictingVersions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>10. What are those conflicting versions?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            rows={3}
                            placeholder="Describe the conflicting versions..."
                            data-testid="textarea-conflicting-versions"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>11. What were the conditions or circumstances under which the incident occurred?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={3}
                          placeholder="Describe conditions/circumstances..."
                          data-testid="textarea-conditions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isOngoing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>12. Is incident still ongoing?</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-ongoing"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isContained"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Is it contained?</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-contained"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="involvesLossOfLife"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-red-200">
                        <div className="space-y-0.5">
                          <FormLabel className="text-red-600">13. Is loss of life involved?</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-loss-of-life"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="involvesSevereHarm"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-orange-200">
                        <div className="space-y-0.5">
                          <FormLabel className="text-orange-600">Is severe harm involved?</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="switch-severe-harm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="measuresImplemented"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>14. What measures have been or are being implemented?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={3}
                          placeholder="Describe measures taken or planned..."
                          data-testid="textarea-measures"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agenciesInformed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>15. Has anyone in the PIU or other government agencies been informed?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          placeholder="List agencies/persons informed..."
                          data-testid="textarea-agencies-informed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agenciesResponse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What has been the response to date?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          placeholder="Describe the response received..."
                          data-testid="textarea-agencies-response"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reportedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reported By</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Name of person filing report" data-testid="input-reported-by" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseForm}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-incident"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingReport ? "Update Report" : "Create Report"}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Incident Report Details
            </DialogTitle>
          </DialogHeader>

          {viewingReport && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                <div className="flex gap-3">
                  <Badge className={`${getClassificationColor(viewingReport.classification)} text-white`}>
                    {viewingReport.classification.charAt(0).toUpperCase() + viewingReport.classification.slice(1)}
                  </Badge>
                  <Badge className={`${getStatusColor(viewingReport.status)} text-white`}>
                    {viewingReport.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">{viewingReport.incidentTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    Reported: {formatDateTime(viewingReport.incidentDateTime)}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {viewingReport.incidentLocation || "N/A"}
                      {viewingReport.state && `, ${viewingReport.state}`}
                      {viewingReport.country && `, ${viewingReport.country}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reported By</p>
                    <p className="font-medium">{viewingReport.reportedBy || "N/A"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="whitespace-pre-wrap">{viewingReport.incidentDescription}</p>
                </div>

                {viewingReport.whatHappened && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">What Happened</p>
                    <p className="whitespace-pre-wrap">{viewingReport.whatHappened}</p>
                  </div>
                )}

                {viewingReport.conditions && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Conditions/Circumstances</p>
                    <p className="whitespace-pre-wrap">{viewingReport.conditions}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${viewingReport.isOngoing ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span>{viewingReport.isOngoing ? 'Ongoing' : 'Not Ongoing'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${viewingReport.isContained ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span>{viewingReport.isContained ? 'Contained' : 'Not Contained'}</span>
                  </div>
                  {viewingReport.involvesLossOfLife && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Loss of Life Involved</span>
                    </div>
                  )}
                  {viewingReport.involvesSevereHarm && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Severe Harm Involved</span>
                    </div>
                  )}
                </div>

                {viewingReport.measuresImplemented && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Measures Implemented</p>
                    <p className="whitespace-pre-wrap">{viewingReport.measuresImplemented}</p>
                  </div>
                )}

                {viewingReport.agenciesInformed && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Agencies Informed</p>
                    <p className="whitespace-pre-wrap">{viewingReport.agenciesInformed}</p>
                  </div>
                )}

                {viewingReport.agenciesResponse && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Agencies Response</p>
                    <p className="whitespace-pre-wrap">{viewingReport.agenciesResponse}</p>
                  </div>
                )}

                <Separator />

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                    Close
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      setIsViewOpen(false);
                      handleEdit(viewingReport);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Report
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
