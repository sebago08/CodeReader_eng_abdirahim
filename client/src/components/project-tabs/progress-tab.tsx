import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectWithRoads, PaymentCertificate } from "@shared/schema";
import ProjectCard from "@/components/project-card";
import BOQProgressTracker from "@/components/project-tabs/boq-progress-tracker";

interface ProgressTabProps {
  project: ProjectWithRoads;
  onEditRoad: (project: ProjectWithRoads, road: any) => void;
  onAddRoad: (project: ProjectWithRoads) => void;
  onAddProgress: (project: ProjectWithRoads, road: any, layerId: string) => void;
  onResetProgress: (layerId: string) => void;
}

export default function ProgressTab({ project, onEditRoad, onAddRoad, onAddProgress, onResetProgress }: ProgressTabProps) {
  const { toast } = useToast();

  // Road delete and duplicate mutations
  const deleteRoadMutation = useMutation({
    mutationFn: async (roadId: string) => {
      await apiRequest("DELETE", `/api/roads/${roadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Road deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete road",
        variant: "destructive",
      });
    },
  });

  const duplicateRoadMutation = useMutation({
    mutationFn: async (roadId: string) => {
      await apiRequest("POST", `/api/roads/${roadId}/duplicate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Road duplicated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate road",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRoad = (road: any) => {
    if (window.confirm(`Are you sure you want to delete "${road.name}"? This will also delete all layer progress data.`)) {
      deleteRoadMutation.mutate(road.id);
    }
  };

  const handleDuplicateRoad = (road: any) => {
    duplicateRoadMutation.mutate(road.id);
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
          className={`grid w-full mb-6 ${project.projectType === "Road" ? "grid-cols-4" : "grid-cols-3"}`} 
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
          {project.projectType === "Road" && (
            <TabsTrigger value="road-tracker" data-testid="tab-road-tracker">
              Road linear tracker
            </TabsTrigger>
          )}
        </TabsList>

        {/* Progress Tracking Sub-Tab (consolidated with BOQ tracker) */}
        <TabsContent value="progress-tracking" className="space-y-6">
          <BOQProgressTracker project={project} />
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
          <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/20 rounded-xl p-6 border border-blue-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500 text-white rounded-lg">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Payment Certificates</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Contract Amount</div>
                  <div className="text-2xl font-bold text-foreground">
                    ${contractAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Amount Paid</div>
                  <div className="text-2xl font-bold text-foreground">
                    ${totalCertified.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Amount Left</div>
                  <div className="text-2xl font-bold text-green-400">
                    ${amountLeft.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-1">Financial Progress</div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">
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
                <p className="text-sm text-muted-foreground">Enter the advance payment amount and click "Add as Certificate" to include it in the IPC table</p>
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
                                    ? "bg-green-950/20 text-green-400 border-green-800"
                                    : certificate.paymentStatus === "In Process"
                                    ? "bg-yellow-950/20 text-yellow-400 border-yellow-800"
                                    : "bg-muted text-muted-foreground border-border"
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
                      <TableRow className="bg-muted font-semibold">
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
                onDeleteRoad={handleDeleteRoad}
                onDuplicateRoad={handleDuplicateRoad}
                onAddProgress={(road, layerId) => onAddProgress(project, road, layerId)}
                onResetProgress={onResetProgress}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
