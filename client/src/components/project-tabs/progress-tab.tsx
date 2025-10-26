import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertActivitySchema } from "@shared/schema";
import type { Activity, ProjectWithRoads, PaymentCertificate } from "@shared/schema";
import { z } from "zod";
import ProjectCard from "@/components/project-card";
import RoadModal from "@/components/road-modal";
import ProgressModal from "@/components/progress-modal";

interface ProgressTabProps {
  project: ProjectWithRoads;
  onEditRoad: (project: ProjectWithRoads, road: any) => void;
  onAddRoad: (project: ProjectWithRoads) => void;
  onAddProgress: (project: ProjectWithRoads, road: any, layerId: string) => void;
  onResetProgress: (layerId: string) => void;
}

const activityFormSchema = insertActivitySchema.extend({
  progress: z.number().min(0).max(100),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

export default function ProgressTab({ project, onEditRoad, onAddRoad, onAddProgress, onResetProgress }: ProgressTabProps) {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: [`/api/projects/${project.id}/activities`],
  });

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      name: "",
      progress: 0,
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: async (data: ActivityFormValues) => {
      await apiRequest("POST", `/api/projects/${project.id}/activities`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/activities`] });
      toast({
        title: "Success",
        description: "Activity created successfully",
      });
      setIsAddModalOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create activity",
        variant: "destructive",
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ActivityFormValues> }) => {
      await apiRequest("PATCH", `/api/activities/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/activities`] });
      toast({
        title: "Success",
        description: "Activity updated successfully",
      });
      setEditingActivity(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update activity",
        variant: "destructive",
      });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/activities`] });
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ActivityFormValues) => {
    if (editingActivity) {
      updateActivityMutation.mutate({ id: editingActivity.id, data });
    } else {
      createActivityMutation.mutate(data);
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    form.reset({
      name: activity.name,
      progress: activity.progress,
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this activity?")) {
      deleteActivityMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingActivity(null);
    form.reset();
  };

  // Financial tab state and queries
  const [advancePayment, setAdvancePayment] = useState<string>(project.advancePayment || "0");
  const [newCertificate, setNewCertificate] = useState({
    certificateNo: "",
    amount: "",
    dateCertified: "",
    paymentStatus: "Submitted",
  });

  const { data: paymentCertificates = [] } = useQuery<PaymentCertificate[]>({
    queryKey: [`/api/projects/${project.id}/payment-certificates`],
  });

  const contractAmount = parseFloat(project.contractAmount || "0");
  const totalCertified = paymentCertificates.reduce(
    (sum, cert) => sum + parseFloat(cert.amountPaid || "0"),
    0
  );
  const amountLeft = contractAmount - totalCertified;
  const financialProgress = contractAmount > 0 ? (totalCertified / contractAmount) * 100 : 0;

  const createCertificateMutation = useMutation({
    mutationFn: async (certificate: any) => {
      await apiRequest("POST", `/api/projects/${project.id}/payment-certificates`, certificate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/payment-certificates`] });
      toast({ title: "Success", description: "Payment certificate added successfully" });
      setNewCertificate({
        certificateNo: "",
        amount: "",
        dateCertified: "",
        paymentStatus: "Submitted",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add payment certificate", variant: "destructive" });
    },
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payment-certificates/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/payment-certificates`] });
      toast({ title: "Success", description: "Certificate deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete certificate", variant: "destructive" });
    },
  });

  const updateCertificateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/payment-certificates/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/payment-certificates`] });
      toast({ title: "Success", description: "Certificate status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update certificate status", variant: "destructive" });
    },
  });

  const updateAdvancePaymentMutation = useMutation({
    mutationFn: async (advancePayment: string) => {
      await apiRequest("PATCH", `/api/projects/${project.id}/advance-payment`, { advancePayment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects`] });
      toast({ title: "Success", description: "Advance payment updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update advance payment", variant: "destructive" });
    },
  });

  const handleAddCertificate = () => {
    if (!newCertificate.certificateNo) {
      toast({ title: "Error", description: "Certificate number is required", variant: "destructive" });
      return;
    }
    if (!newCertificate.amount) {
      toast({ title: "Error", description: "Amount is required", variant: "destructive" });
      return;
    }
    
    // Map amount to the correct column based on status
    const amount = newCertificate.amount;
    const pendingAmount = newCertificate.paymentStatus === "Submitted" ? amount : "0";
    const inProcessAmount = newCertificate.paymentStatus === "In Process" ? amount : "0";
    const amountPaid = newCertificate.paymentStatus === "Paid" ? amount : "0";
    
    createCertificateMutation.mutate({
      certificateNo: newCertificate.certificateNo,
      pendingAmount,
      inProcessAmount,
      amountPaid,
      dateCertified: newCertificate.dateCertified || null,
      paymentStatus: newCertificate.paymentStatus,
    });
  };

  const handleAdvancePaymentBlur = () => {
    updateAdvancePaymentMutation.mutate(advancePayment);
  };

  const handleAddAdvancePaymentCertificate = () => {
    const advanceAmount = parseFloat(advancePayment);
    if (!advanceAmount || advanceAmount <= 0) {
      toast({ title: "Error", description: "Please enter a valid advance payment amount", variant: "destructive" });
      return;
    }

    // Check if advance payment certificate already exists
    const existingAdvanceCert = paymentCertificates.find(cert => 
      cert.certificateNo.toLowerCase().includes("advance") || cert.certificateNo === "ADV"
    );

    if (existingAdvanceCert) {
      toast({ title: "Info", description: "Advance payment certificate already exists", variant: "default" });
      return;
    }

    createCertificateMutation.mutate({
      certificateNo: "Advance Payment",
      pendingAmount: "0",
      inProcessAmount: "0",
      amountPaid: advanceAmount.toString(),
      dateCertified: new Date().toISOString().split('T')[0],
      paymentStatus: "Paid",
    });
  };

  const totalPending = paymentCertificates.reduce((sum, cert) => sum + parseFloat(cert.pendingAmount || "0"), 0);
  const totalInProcess = paymentCertificates.reduce((sum, cert) => sum + parseFloat(cert.inProcessAmount || "0"), 0);
  const totalPaid = paymentCertificates.reduce((sum, cert) => sum + parseFloat(cert.amountPaid || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Nested Sub-Tabs */}
      <Tabs defaultValue="progress-tracking" className="w-full">
        <TabsList 
          className={`grid w-full mb-6 ${project.projectType === "Road" ? "grid-cols-5" : "grid-cols-4"}`} 
          data-testid="progress-subtabs"
        >
          <TabsTrigger value="progress-tracking" data-testid="tab-progress-tracking">
            Progress Tracking
          </TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones">
            Milestones
          </TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">
            Financial
          </TabsTrigger>
          <TabsTrigger value="updates" data-testid="tab-updates">
            Updates
          </TabsTrigger>
          {project.projectType === "Road" && (
            <TabsTrigger value="road-tracker" data-testid="tab-road-tracker">
              Road linear tracker
            </TabsTrigger>
          )}
        </TabsList>

        {/* Progress Tracking Sub-Tab */}
        <TabsContent value="progress-tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle data-testid="heading-progress-tracking">Progress Tracking</CardTitle>
                  <CardDescription>Track overall project progress</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Overall Project Progress</span>
                    <span className="text-sm font-medium">56%</span>
                  </div>
                  <Progress value={56} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activities Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Project Activities</CardTitle>
                  <CardDescription>Track progress of project activities and milestones</CardDescription>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-activity">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No activities added yet. Click "Add Activity" to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity Name</TableHead>
                      <TableHead>Progress %</TableHead>
                      <TableHead>Progress Bar</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id} data-testid={`activity-row-${activity.id}`}>
                        <TableCell className="font-medium" data-testid={`activity-name-${activity.id}`}>
                          {activity.name}
                        </TableCell>
                        <TableCell data-testid={`activity-progress-${activity.id}`}>
                          {activity.progress}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={activity.progress} className="flex-1" />
                            <span className="text-sm font-medium w-16 text-right">
                              {activity.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(activity)}
                              data-testid={`button-edit-activity-${activity.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(activity.id)}
                              data-testid={`button-delete-activity-${activity.id}`}
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
        </TabsContent>

        {/* Milestones Sub-Tab */}
        <TabsContent value="milestones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-milestones">Milestones</CardTitle>
              <CardDescription>Track project milestones and key deliverables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>Milestones feature coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Sub-Tab */}
        <TabsContent value="financial" className="space-y-6">
          {/* Payment Certificates Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500 text-white rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Payment Certificates</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contract Amount</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${contractAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Certified</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${totalCertified.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount Left</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${amountLeft.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Financial Progress</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {financialProgress.toFixed(1)}%
                  </div>
                  <Progress value={financialProgress} className="h-2" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Advance Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Advance Payment (USD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex gap-2 max-w-2xl">
                  <Input
                    type="number"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(e.target.value)}
                    onBlur={handleAdvancePaymentBlur}
                    placeholder="Enter advance payment amount"
                    className="flex-1"
                    data-testid="input-advance-payment"
                  />
                  <Button
                    onClick={handleAddAdvancePaymentCertificate}
                    disabled={createCertificateMutation.isPending || !advancePayment || parseFloat(advancePayment) <= 0}
                    className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white whitespace-nowrap"
                    data-testid="button-add-advance-certificate"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add as Certificate
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Enter the advance payment amount and click "Add as Certificate" to include it in the IPC table</p>
              </div>
            </CardContent>
          </Card>

          {/* Add Certificate Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Certificate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <Label className="text-sm mb-2">Certificate No. *</Label>
                  <Input
                    type="text"
                    placeholder="e.g., IPC01"
                    value={newCertificate.certificateNo}
                    onChange={(e) => setNewCertificate({ ...newCertificate, certificateNo: e.target.value })}
                    data-testid="input-certificate-no"
                  />
                </div>
                <div>
                  <Label className="text-sm mb-2">Amount (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCertificate.amount}
                    onChange={(e) => setNewCertificate({ ...newCertificate, amount: e.target.value })}
                    data-testid="input-certificate-amount"
                  />
                </div>
                <div>
                  <Label className="text-sm mb-2">Date Certified</Label>
                  <Input
                    type="date"
                    value={newCertificate.dateCertified}
                    onChange={(e) => setNewCertificate({ ...newCertificate, dateCertified: e.target.value })}
                    data-testid="input-certificate-date"
                  />
                </div>
                <div>
                  <Label className="text-sm mb-2">Payment Status *</Label>
                  <Select
                    value={newCertificate.paymentStatus}
                    onValueChange={(value) => setNewCertificate({ ...newCertificate, paymentStatus: value })}
                  >
                    <SelectTrigger data-testid="select-certificate-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="In Process">In Process</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAddCertificate}
                    disabled={createCertificateMutation.isPending}
                    className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                    data-testid="button-add-certificate"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certificate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificates Table */}
          <Card>
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentCertificates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No payment certificates added yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Certificate No.</TableHead>
                        <TableHead>Submitted Amount (USD)</TableHead>
                        <TableHead>In Process Amount (USD)</TableHead>
                        <TableHead>Amount Paid (USD)</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...paymentCertificates]
                        .sort((a, b) => {
                          // Sort advance payment first
                          const isAAdvance = a.certificateNo.toLowerCase().includes('advance');
                          const isBAdvance = b.certificateNo.toLowerCase().includes('advance');
                          if (isAAdvance && !isBAdvance) return -1;
                          if (!isAAdvance && isBAdvance) return 1;
                          return 0;
                        })
                        .map((certificate) => (
                        <TableRow key={certificate.id}>
                          <TableCell className="font-medium">{certificate.certificateNo}</TableCell>
                          <TableCell>
                            {parseFloat(certificate.pendingAmount || "0") > 0
                              ? parseFloat(certificate.pendingAmount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {parseFloat(certificate.inProcessAmount || "0") > 0
                              ? parseFloat(certificate.inProcessAmount || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {parseFloat(certificate.amountPaid || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={certificate.paymentStatus}
                              onValueChange={(value) => updateCertificateStatusMutation.mutate({ id: certificate.id, status: value })}
                              disabled={updateCertificateStatusMutation.isPending}
                            >
                              <SelectTrigger 
                                className={`w-[140px] ${
                                  certificate.paymentStatus === "Paid"
                                    ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
                                    : certificate.paymentStatus === "In Process"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
                                    : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                                }`}
                                data-testid={`select-status-${certificate.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Submitted">Submitted</SelectItem>
                                <SelectItem value="In Process">In Process</SelectItem>
                                <SelectItem value="Paid">Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCertificateMutation.mutate(certificate.id)}
                              disabled={deleteCertificateMutation.isPending}
                              data-testid={`button-delete-certificate-${certificate.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell>
                          ${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          ${totalInProcess.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Updates Sub-Tab */}
        <TabsContent value="updates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-updates">Updates</CardTitle>
              <CardDescription>Project updates and notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>Updates feature coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Road Linear Tracker Sub-Tab - Only for Road projects */}
        {project.projectType === "Road" && (
          <TabsContent value="road-tracker" className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4" data-testid="heading-road-tracker">
                Road Construction Details
              </h3>
              <ProjectCard
                project={project}
                onEdit={() => {}}
                onDelete={() => {}}
                onDuplicate={() => {}}
                onAddRoad={() => onAddRoad(project)}
                onEditRoad={(road) => onEditRoad(project, road)}
                onAddProgress={(road, layerId) => onAddProgress(project, road, layerId)}
                onResetProgress={onResetProgress}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Activity Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-semibold text-card-foreground">
                {editingActivity ? "Edit Activity" : "Add New Activity"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-close-activity-modal"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter activity name"
                          {...field}
                          data-testid="input-activity-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="0-100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-activity-progress"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    onClick={handleCloseModal}
                    variant="outline"
                    data-testid="button-cancel-activity"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createActivityMutation.isPending || updateActivityMutation.isPending}
                    data-testid="button-submit-activity"
                  >
                    {createActivityMutation.isPending || updateActivityMutation.isPending
                      ? "Saving..."
                      : editingActivity
                      ? "Update Activity"
                      : "Create Activity"}
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
