'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Trash2, CheckCircle, DollarSign, Flag, Clock } from 'lucide-react';
import { PlannedActivity, ProgressTracking, PaymentCertificate } from '../types/project';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface ProgressTabProps {
  projectId: string;
  activities: PlannedActivity[];
  progressTracking: ProgressTracking[];
  paymentCertificates: PaymentCertificate[];
  advancePayment?: string;
  contractAmount: string;
  workAccomplished: string[];
  onLocalUpdate?: (data: {
    progressTracking: ProgressTracking[];
    paymentCertificates: PaymentCertificate[];
    advancePayment?: string;
    workAccomplished: string[];
    progress: number;
  }) => void;
}

const PAYMENT_STATUS_OPTIONS = [
  'Paid',
  'In Process',
  'Pending',
  'Submitted',
  'Approved',
  'Rejected'
];

export function ProgressTab({
  projectId,
  activities,
  progressTracking: initialProgressTracking,
  paymentCertificates: initialPaymentCertificates,
  advancePayment: initialAdvancePayment,
  contractAmount,
  workAccomplished: initialWorkAccomplished,
  onLocalUpdate,
}: ProgressTabProps) {
  const [progressTracking, setProgressTracking] = useState<ProgressTracking[]>(initialProgressTracking);
  const [paymentCertificates, setPaymentCertificates] = useState<PaymentCertificate[]>(initialPaymentCertificates);
  const [advancePayment, setAdvancePayment] = useState(initialAdvancePayment || '');
  const [workAccomplished, setWorkAccomplished] = useState<string[]>(initialWorkAccomplished);
  const [newWorkItem, setNewWorkItem] = useState('');
  const [newCertificate, setNewCertificate] = useState({ 
    certificateNo: '', 
    amount: '', 
    dateCertified: '', 
    dateSentToPCU: '', 
    paymentDateStatus: '' 
  });

  // LocalStorage keys
  const progressTrackingKey = `progress-tracking-${projectId}`;
  const paymentCertificatesKey = `payment-certificates-${projectId}`;
  const advancePaymentKey = `advance-payment-${projectId}`;
  const workAccomplishedKey = `work-accomplished-${projectId}`;

  // Load data from localStorage on mount
  useEffect(() => {
    const storedProgress = localStorage.getItem(progressTrackingKey);
    if (storedProgress) {
      try {
        setProgressTracking(JSON.parse(storedProgress));
      } catch (error) {
        console.error('Error parsing stored progress:', error);
      }
    }

    const storedCertificates = localStorage.getItem(paymentCertificatesKey);
    if (storedCertificates) {
      try {
        setPaymentCertificates(JSON.parse(storedCertificates));
      } catch (error) {
        console.error('Error parsing stored certificates:', error);
      }
    }

    const storedAdvance = localStorage.getItem(advancePaymentKey);
    if (storedAdvance) {
      setAdvancePayment(storedAdvance);
    }

    const storedWork = localStorage.getItem(workAccomplishedKey);
    if (storedWork) {
      try {
        setWorkAccomplished(JSON.parse(storedWork));
      } catch (error) {
        console.error('Error parsing stored work:', error);
      }
    }
  }, [projectId, progressTrackingKey, paymentCertificatesKey, advancePaymentKey, workAccomplishedKey]);

  const saveChanges = (updates: Partial<{
    progressTracking: ProgressTracking[];
    paymentCertificates: PaymentCertificate[];
    advancePayment: string;
    workAccomplished: string[];
  }>) => {
    try {
      const finalProgressTracking = updates.progressTracking || progressTracking;
      const finalPaymentCertificates = updates.paymentCertificates || paymentCertificates;
      const finalAdvancePayment = updates.advancePayment !== undefined ? updates.advancePayment : advancePayment;
      const finalWorkAccomplished = updates.workAccomplished || workAccomplished;
      
      // Save to localStorage
      if (updates.progressTracking !== undefined) {
        localStorage.setItem(progressTrackingKey, JSON.stringify(finalProgressTracking));
      }
      
      if (updates.paymentCertificates !== undefined) {
        localStorage.setItem(paymentCertificatesKey, JSON.stringify(finalPaymentCertificates));
      }
      
      if (updates.advancePayment !== undefined) {
        localStorage.setItem(advancePaymentKey, finalAdvancePayment);
      }
      
      if (updates.workAccomplished !== undefined) {
        localStorage.setItem(workAccomplishedKey, JSON.stringify(finalWorkAccomplished));
      }

      // Calculate overall progress
      const overallProgress =
        finalProgressTracking && finalProgressTracking.length > 0
          ? Math.round(
              finalProgressTracking.reduce((sum: number, p: any) => sum + p.progress, 0) /
                finalProgressTracking.length
            )
          : 0;
      
      onLocalUpdate?.({
        progressTracking: finalProgressTracking,
        paymentCertificates: finalPaymentCertificates,
        advancePayment: finalAdvancePayment,
        workAccomplished: finalWorkAccomplished,
        progress: overallProgress,
      });
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Failed to save changes');
    }
  };

  const updateProgress = (activityId: string, progress: number) => {
    const newProgress = Math.min(100, Math.max(0, progress));
    const updatedTracking = progressTracking.map(p =>
      p.activityId === activityId ? { ...p, progress: newProgress } : p
    );

    // If tracking doesn't exist, create it
    if (!progressTracking.find(p => p.activityId === activityId)) {
      updatedTracking.push({ activityId, progress: newProgress });
    }

    setProgressTracking(updatedTracking);
    saveChanges({ progressTracking: updatedTracking });
    toast.success('Progress updated');
  };

  const calculateOverallProgress = (): number => {
    if (progressTracking.length === 0) return 0;
    const total = progressTracking.reduce((sum, p) => sum + p.progress, 0);
    return Math.round(total / progressTracking.length);
  };

  const getContractAmount = (): number => {
    const amount = contractAmount.replace(/[$,]/g, '');
    return parseFloat(amount) || 0;
  };

  const getTotalCertified = (): number => {
    const certificatesTotal = paymentCertificates.reduce((sum, cert) => sum + cert.amount, 0);
    const advancePaymentAmount = parseFloat(advancePayment?.replace(/[$,]/g, '') || '0') || 0;
    return certificatesTotal + advancePaymentAmount;
  };

  const getAmountLeft = (): number => {
    return getContractAmount() - getTotalCertified();
  };

  const getFinancialProgress = (): number => {
    const contractAmt = getContractAmount();
    if (contractAmt === 0) return 0;
    return Math.round((getTotalCertified() / contractAmt) * 100 * 10) / 10;
  };

  const getCertificateProgress = (amount: number): number => {
    const contractAmt = getContractAmount();
    if (contractAmt === 0) return 0;
    return Math.round((amount / contractAmt) * 100 * 10) / 10;
  };

  const getTotalByStatus = (status: string): number => {
    return paymentCertificates
      .filter(cert => cert.paymentDateStatus === status)
      .reduce((sum, cert) => sum + cert.amount, 0);
  };

  const addCertificate = () => {
    if (!newCertificate.certificateNo || !newCertificate.amount) {
      toast.error('Please fill in certificate number and amount');
      return;
    }

    const certificate: PaymentCertificate = {
      id: `cert-${Date.now()}`,
      certificateNo: newCertificate.certificateNo,
      amount: parseFloat(newCertificate.amount),
      dateCertified: newCertificate.dateCertified || undefined,
      dateSentToPCU: newCertificate.dateSentToPCU || undefined,
      paymentDateStatus: newCertificate.paymentDateStatus || undefined,
    };

    const updatedCertificates = [...paymentCertificates, certificate];
    setPaymentCertificates(updatedCertificates);
    saveChanges({ paymentCertificates: updatedCertificates });
    setNewCertificate({ certificateNo: '', amount: '', dateCertified: '', dateSentToPCU: '', paymentDateStatus: '' });
    toast.success('Certificate added successfully');
  };

  const removeCertificate = (id: string) => {
    const updatedCertificates = paymentCertificates.filter(c => c.id !== id);
    setPaymentCertificates(updatedCertificates);
    saveChanges({ paymentCertificates: updatedCertificates });
    toast.success('Certificate removed');
  };

  const updateCertificate = (id: string, field: keyof PaymentCertificate, value: string | number) => {
    const updatedCertificates = paymentCertificates.map(cert => {
      if (cert.id !== id) return cert;
      
      if (field === 'amount') {
        return { ...cert, amount: typeof value === 'string' ? parseFloat(value) : value };
      }
      
      return { ...cert, [field]: value };
    });

    setPaymentCertificates(updatedCertificates);
    saveChanges({ paymentCertificates: updatedCertificates });
    toast.success('Certificate updated');
  };

  const updateAdvancePayment = (value: string) => {
    setAdvancePayment(value);
    saveChanges({ advancePayment: value });
    toast.success('Advance payment updated');
  };

  const addWorkItem = () => {
    if (!newWorkItem.trim()) {
      toast.error('Please enter a work item');
      return;
    }

    const updatedWork = [...workAccomplished, newWorkItem.trim()];
    setWorkAccomplished(updatedWork);
    saveChanges({ workAccomplished: updatedWork });
    setNewWorkItem('');
    toast.success('Work item added');
  };

  const removeWorkItem = (index: number) => {
    const updatedWork = workAccomplished.filter((_, i) => i !== index);
    setWorkAccomplished(updatedWork);
    saveChanges({ workAccomplished: updatedWork });
    toast.success('Work item removed');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div>
      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="tracking">Progress Tracking</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
        </TabsList>

        {/* Progress Tracking Sub-Tab */}
        <TabsContent value="tracking">
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
              <ClipboardList className="w-5 h-5" />
              Progress Tracking
            </h3>

            {/* Overall Progress */}
            <div className="bg-[#1a5276]/10 p-5 rounded-lg mb-5">
              <div className="flex justify-between items-center mb-2">
                <span>Overall Project Progress</span>
                <span className="text-[#1a5276]">{calculateOverallProgress()}%</span>
              </div>
              <Progress value={calculateOverallProgress()} className="h-4" />
            </div>

            {/* Progress Table */}
            {activities.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity Name</TableHead>
                      <TableHead>Progress %</TableHead>
                      <TableHead>Progress Bar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => {
                      const tracking = progressTracking.find(p => p.activityId === activity.id);
                      const progress = tracking?.progress || 0;
                      return (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={progress}
                              onChange={(e) => updateProgress(activity.id, parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-2 flex-1" />
                              <span className="text-sm text-muted-foreground min-w-[40px]">{progress}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No activities to track. Please add activities in the Work Plan tab first.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Milestones Sub-Tab */}
        <TabsContent value="milestones">
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
              <Flag className="w-5 h-5" />
              Project Milestones
            </h3>

            {activities.some(a => a.isMilestone) ? (
              <div className="space-y-3">
                {activities
                  .filter(a => a.isMilestone)
                  .map((milestone) => {
                    const tracking = progressTracking.find(p => p.activityId === milestone.id);
                    const progress = tracking?.progress || 0;
                    const isCompleted = progress === 100;
                    
                    return (
                      <div 
                        key={milestone.id} 
                        className="flex items-start gap-4 p-5 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className={`mt-1 ${isCompleted ? 'text-[#27ae60]' : 'text-muted-foreground'}`}>
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : (
                            <Clock className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-lg ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {milestone.name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {isCompleted ? (
                                <span className="text-[#27ae60] flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" />
                                  Completed on: {formatDate(milestone.endDate)}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Due on: {formatDate(milestone.endDate)}
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-3 flex items-center gap-2">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground min-w-[45px]">{progress}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Flag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No milestones defined yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to the Work Plan tab and mark activities as milestones using the flag button.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Financial Sub-Tab */}
        <TabsContent value="financial">
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
              <DollarSign className="w-5 h-5" />
              Payment Certificates
            </h3>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-border p-5 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Contract Amount</p>
                <p className="text-2xl">${getContractAmount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white border border-border p-5 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Total Certified</p>
                <p className="text-2xl">${getTotalCertified().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white border border-border p-5 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Amount Left</p>
                <p className="text-2xl text-[#27ae60]">${getAmountLeft().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white border border-border p-5 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-muted-foreground">Financial Progress</p>
                  <p className="text-sm">{getFinancialProgress()}%</p>
                </div>
                <Progress value={getFinancialProgress()} className="h-2 [&>div]:bg-[#3498db]" />
              </div>
            </div>

            {/* Advance Payment Input */}
            <div className="bg-muted/30 p-5 rounded-lg mb-5">
              <Label htmlFor="advance-payment" className="mb-2 block">Advance Payment (USD)</Label>
              <Input
                id="advance-payment"
                type="number"
                step="0.01"
                placeholder="Enter advance payment amount"
                value={advancePayment}
                onChange={(e) => updateAdvancePayment(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Enter the advance payment amount received for this project
              </p>
            </div>

            {/* Add Certificate Form */}
            <div className="bg-muted/30 p-5 rounded-lg mb-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm">Certificate No. *</Label>
                  <Input
                    placeholder="e.g., IPC01"
                    value={newCertificate.certificateNo}
                    onChange={(e) => setNewCertificate({ ...newCertificate, certificateNo: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Amount (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newCertificate.amount}
                    onChange={(e) => setNewCertificate({ ...newCertificate, amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Date Certified</Label>
                  <Input
                    type="date"
                    value={newCertificate.dateCertified}
                    onChange={(e) => setNewCertificate({ ...newCertificate, dateCertified: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Payment Status</Label>
                  <Select
                    value={newCertificate.paymentDateStatus}
                    onValueChange={(value) => setNewCertificate({ ...newCertificate, paymentDateStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                type="button" 
                onClick={addCertificate} 
                className="bg-[#1a5276] hover:bg-[#14455f]"
                disabled={!newCertificate.certificateNo || !newCertificate.amount}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Certificate
              </Button>
            </div>

            {/* Certificates Table */}
            {(paymentCertificates.length > 0 || (advancePayment && parseFloat(advancePayment) > 0)) ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificate No.</TableHead>
                      <TableHead>Pending Amount (USD)</TableHead>
                      <TableHead>In Process Amount (USD)</TableHead>
                      <TableHead>Amount Paid (USD)</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Payment Certificates */}
                    {paymentCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <Input
                            value={cert.certificateNo}
                            onChange={(e) => updateCertificate(cert.id, 'certificateNo', e.target.value)}
                            className="min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell>
                          {cert.paymentDateStatus === 'Pending' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={cert.amount}
                              onChange={(e) => updateCertificate(cert.id, 'amount', e.target.value)}
                              className="min-w-[120px]"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cert.paymentDateStatus === 'In Process' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={cert.amount}
                              onChange={(e) => updateCertificate(cert.id, 'amount', e.target.value)}
                              className="min-w-[120px]"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cert.paymentDateStatus === 'Paid' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={cert.amount}
                              onChange={(e) => updateCertificate(cert.id, 'amount', e.target.value)}
                              className="min-w-[120px]"
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={cert.paymentDateStatus || ''}
                            onValueChange={(value) => updateCertificate(cert.id, 'paymentDateStatus', value)}
                          >
                            <SelectTrigger className="min-w-[140px]">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCertificate(cert.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell>
                        <strong>Total</strong>
                      </TableCell>
                      <TableCell>
                        <strong>
                          ${getTotalByStatus('Pending').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <strong>
                          ${getTotalByStatus('In Process').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <strong>
                          ${getTotalByStatus('Paid').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No payment certificates recorded yet.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Work Accomplished/Updates Sub-Tab */}
        <TabsContent value="updates">
          <div className="mb-8">
            <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
              <CheckCircle className="w-5 h-5" />
              Work Accomplished This Period
            </h3>

            {/* Add Work Item */}
            <div className="bg-muted/30 p-5 rounded-lg mb-5">
              <div className="flex gap-4">
                <Input
                  placeholder="Describe completed work..."
                  value={newWorkItem}
                  onChange={(e) => setNewWorkItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWorkItem())}
                />
                <Button 
                  type="button" 
                  onClick={addWorkItem} 
                  className="bg-[#27ae60] hover:bg-[#229954]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Work Items List */}
            {workAccomplished.length > 0 ? (
              <div className="space-y-3">
                {workAccomplished.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-[#27ae60]/10 rounded-lg border border-[#27ae60]/20">
                    <div className="w-2 h-2 rounded-full bg-[#27ae60] mt-2" />
                    <p className="flex-1">{item}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWorkItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No work items recorded yet.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
