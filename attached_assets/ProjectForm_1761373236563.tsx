'use client';

import { ArrowLeft, Info, Building, HardHat, CalendarIcon, Plus, Trash2, AlertCircle, FileText, Edit2, X, RotateCcw, Filter, Users, ListTodo, CheckCircle } from 'lucide-react';
import { Project, PlannedActivity, ProgressTracking, PaymentCertificate, Issue, ContractorPersonnel, ContractorEquipment, ClientPersonnel } from '../types/project';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RichTextEditor } from './RichTextEditor';
import { FormEvent, useEffect, useState } from 'react';

interface ProjectFormProps {
  project?: Project;
  onSave: (project: Partial<Project>) => void;
  onCancel: () => void;
}

const PAYMENT_STATUS_OPTIONS = [
  'Paid',
  'In Process',
  'Pending',
  'Submitted',
  'Approved',
  'Rejected'
];

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    location: '',
    contractAmount: '',
    advancePayment: '',
    description: '',
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    clientLogo: '',
    contractorName: '',
    contractorContact: '',
    contractorEmail: '',
    contractorPhone: '',
    scope: '',
    startDate: '',
    duration: '',
    durationUnit: 'months' as 'days' | 'months',
    expectedCompletionDate: '',
    defectsLiabilityPeriod: '',
  });

  const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>([]);
  const [progressTracking, setProgressTracking] = useState<ProgressTracking[]>([]);
  const [workAccomplished, setWorkAccomplished] = useState<string[]>([]);
  const [issuesAndConcerns, setIssuesAndConcerns] = useState<Issue[]>([]);
  const [paymentCertificates, setPaymentCertificates] = useState<PaymentCertificate[]>([]);
  const [contractorPersonnel, setContractorPersonnel] = useState<ContractorPersonnel[]>([]);
  const [contractorEquipment, setContractorEquipment] = useState<ContractorEquipment[]>([]);
  const [clientPersonnel, setClientPersonnel] = useState<ClientPersonnel[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [locationAndExtent, setLocationAndExtent] = useState('');
  const [newIssue, setNewIssue] = useState({ description: '', status: 'outstanding' as 'outstanding' | 'resolved', dateCaptured: new Date().toISOString().split('T')[0], comment: '' });
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [issueFilter, setIssueFilter] = useState<'all' | 'outstanding' | 'resolved'>('all');
  const [newPersonnel, setNewPersonnel] = useState({ name: '', qualification: '', designation: '' });
  const [newEquipment, setNewEquipment] = useState({ name: '', type: '', quantity: '', condition: '' });
  const [newClientPersonnel, setNewClientPersonnel] = useState({ name: '', qualification: '', designation: '' });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        number: project.number,
        location: project.location,
        contractAmount: project.contractAmount,
        advancePayment: project.advancePayment || '',
        description: project.description || '',
        clientName: project.client.name,
        clientContact: project.client.contact,
        clientEmail: project.client.email,
        clientPhone: project.client.phone,
        clientAddress: project.client.address,
        clientLogo: project.client.logo || '',
        contractorName: project.contractor.name,
        contractorContact: project.contractor.contact,
        contractorEmail: project.contractor.email,
        contractorPhone: project.contractor.phone,
        scope: project.scope,
        startDate: project.startDate || '',
        duration: project.duration?.toString() || '',
        durationUnit: project.durationUnit || 'months',
        expectedCompletionDate: project.expectedCompletionDate || '',
        defectsLiabilityPeriod: project.defectsLiabilityPeriod || '',
      });
      setPlannedActivities(project.plannedActivities || []);
      setProgressTracking(project.progressTracking || []);
      setWorkAccomplished(project.workAccomplished || []);
      setIssuesAndConcerns(project.issuesAndConcerns || []);
      setPaymentCertificates(project.paymentCertificates || []);
      setContractorPersonnel(project.contractor.personnel || []);
      setContractorEquipment(project.contractor.equipment || []);
      setClientPersonnel(project.client.personnel || []);
      setExecutiveSummary(project.executiveSummary || '');
      setLocationAndExtent(project.locationAndExtent || '');
    }
  }, [project]);

  // Auto-calculate expected completion date when start date or duration changes
  useEffect(() => {
    if (formData.startDate && formData.duration) {
      const duration = parseInt(formData.duration);
      if (!isNaN(duration) && duration > 0) {
        const start = new Date(formData.startDate);
        
        if (formData.durationUnit === 'months') {
          // Add months
          start.setMonth(start.getMonth() + duration);
        } else {
          // Add days
          start.setDate(start.getDate() + duration);
        }
        
        const expectedDate = start.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, expectedCompletionDate: expectedDate }));
      }
    } else {
      setFormData(prev => ({ ...prev, expectedCompletionDate: '' }));
    }
  }, [formData.startDate, formData.duration, formData.durationUnit]);



  const calculateOverallProgress = (): number => {
    if (progressTracking.length === 0) return 0;
    const total = progressTracking.reduce((sum, p) => sum + p.progress, 0);
    return Math.round(total / progressTracking.length);
  };

  const addOrUpdateIssue = () => {
    if (newIssue.description.trim()) {
      if (editingIssueId) {
        // Update existing issue
        setIssuesAndConcerns(issuesAndConcerns.map(issue =>
          issue.id === editingIssueId
            ? { ...issue, description: newIssue.description, comment: newIssue.comment, dateCaptured: newIssue.dateCaptured }
            : issue
        ));
        setEditingIssueId(null);
      } else {
        // Add new issue
        const issue: Issue = {
          id: `issue-${Date.now()}`,
          description: newIssue.description.trim(),
          status: 'outstanding',
          dateCaptured: newIssue.dateCaptured,
          comment: newIssue.comment.trim() || undefined,
        };
        setIssuesAndConcerns([...issuesAndConcerns, issue]);
      }
      setNewIssue({ description: '', status: 'outstanding', dateCaptured: new Date().toISOString().split('T')[0], comment: '' });
    }
  };

  const editIssue = (issue: Issue) => {
    setNewIssue({
      description: issue.description,
      status: issue.status,
      dateCaptured: issue.dateCaptured,
      comment: issue.comment || '',
    });
    setEditingIssueId(issue.id);
  };

  const cancelEditIssue = () => {
    setNewIssue({ description: '', status: 'outstanding', dateCaptured: new Date().toISOString().split('T')[0], comment: '' });
    setEditingIssueId(null);
  };

  const removeIssue = (id: string) => {
    setIssuesAndConcerns(issuesAndConcerns.filter(issue => issue.id !== id));
  };

  const reopenIssue = (id: string) => {
    setIssuesAndConcerns(issuesAndConcerns.map(issue =>
      issue.id === id
        ? { ...issue, status: 'outstanding', resolvedDate: undefined, resolutionNotes: undefined }
        : issue
    ));
  };

  const resolveIssue = (id: string, resolutionNotes: string) => {
    setIssuesAndConcerns(issuesAndConcerns.map(issue =>
      issue.id === id
        ? { ...issue, status: 'resolved', resolvedDate: new Date().toISOString().split('T')[0], resolutionNotes }
        : issue
    ));
  };

  const getFilteredIssues = () => {
    if (issueFilter === 'all') return issuesAndConcerns;
    return issuesAndConcerns.filter(issue => issue.status === issueFilter);
  };

  const addCertificate = () => {
    if (newCertificate.certificateNo && newCertificate.amount) {
      const certificate: PaymentCertificate = {
        id: `cert-${Date.now()}`,
        certificateNo: newCertificate.certificateNo,
        amount: parseFloat(newCertificate.amount),
        dateCertified: newCertificate.dateCertified || undefined,
        dateSentToPCU: newCertificate.dateSentToPCU || undefined,
        paymentDateStatus: newCertificate.paymentDateStatus || undefined,
      };
      setPaymentCertificates([...paymentCertificates, certificate]);
      setNewCertificate({ certificateNo: '', amount: '', dateCertified: '', dateSentToPCU: '', paymentDateStatus: '' });
    }
  };

  const removeCertificate = (id: string) => {
    setPaymentCertificates(paymentCertificates.filter(c => c.id !== id));
  };

  const updateCertificate = (id: string, field: keyof PaymentCertificate, value: string | number) => {
    setPaymentCertificates(prev => prev.map(cert => {
      if (cert.id !== id) return cert;
      
      if (field === 'amount') {
        return { ...cert, amount: typeof value === 'string' ? parseFloat(value) : value };
      }
      
      return { ...cert, [field]: value };
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const projectData: Partial<Project> = {
      name: formData.name,
      number: formData.number,
      location: formData.location,
      contractAmount: formData.contractAmount,
      advancePayment: formData.advancePayment || undefined,
      client: {
        name: formData.clientName,
        contact: formData.clientContact,
        email: formData.clientEmail,
        phone: formData.clientPhone,
        address: formData.clientAddress,
        logo: formData.clientLogo,
        personnel: clientPersonnel,
      },
      contractor: {
        name: formData.contractorName,
        contact: formData.contractorContact,
        email: formData.contractorEmail,
        phone: formData.contractorPhone,
        personnel: contractorPersonnel,
        equipment: contractorEquipment,
      },
      scope: formData.scope,
      description: formData.description,
      status: project?.status || 'active',
      progress: calculateOverallProgress(),
      startDate: formData.startDate || project?.startDate || new Date().toISOString().split('T')[0],
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      durationUnit: formData.durationUnit,
      expectedCompletionDate: formData.expectedCompletionDate || undefined,
      defectsLiabilityPeriod: formData.defectsLiabilityPeriod || undefined,
      plannedActivities,
      progressTracking,
      workAccomplished,
      issuesAndConcerns,
      paymentCertificates,
      executiveSummary,
      locationAndExtent,
      coverImage: project?.coverImage || '', // Preserve existing cover image
    };

    onSave(projectData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPersonnel = () => {
    if (newPersonnel.name && newPersonnel.qualification && newPersonnel.designation) {
      const personnel: ContractorPersonnel = {
        id: `personnel-${Date.now()}`,
        name: newPersonnel.name,
        qualification: newPersonnel.qualification,
        designation: newPersonnel.designation,
      };
      setContractorPersonnel([...contractorPersonnel, personnel]);
      setNewPersonnel({ name: '', qualification: '', designation: '' });
    }
  };

  const removePersonnel = (id: string) => {
    setContractorPersonnel(contractorPersonnel.filter(p => p.id !== id));
  };

  const addEquipment = () => {
    if (newEquipment.name && newEquipment.type && newEquipment.quantity && newEquipment.condition) {
      const equipment: ContractorEquipment = {
        id: `equipment-${Date.now()}`,
        name: newEquipment.name,
        type: newEquipment.type,
        quantity: parseInt(newEquipment.quantity),
        condition: newEquipment.condition,
      };
      setContractorEquipment([...contractorEquipment, equipment]);
      setNewEquipment({ name: '', type: '', quantity: '', condition: '' });
    }
  };

  const removeEquipment = (id: string) => {
    setContractorEquipment(contractorEquipment.filter(e => e.id !== id));
  };

  const addClientPersonnel = () => {
    if (newClientPersonnel.name && newClientPersonnel.qualification && newClientPersonnel.designation) {
      const personnel: ClientPersonnel = {
        id: `client-personnel-${Date.now()}`,
        name: newClientPersonnel.name,
        qualification: newClientPersonnel.qualification,
        designation: newClientPersonnel.designation,
      };
      setClientPersonnel([...clientPersonnel, personnel]);
      setNewClientPersonnel({ name: '', qualification: '', designation: '' });
    }
  };

  const removeClientPersonnel = (id: string) => {
    setClientPersonnel(clientPersonnel.filter(p => p.id !== id));
  };

  const updateActivityDuration = (id: string, newDuration: number) => {
    if (newDuration > 0) {
      setPlannedActivities(plannedActivities.map(activity => {
        if (activity.id === id) {
          const startDate = new Date(activity.startDate);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + newDuration);
          
          return {
            ...activity,
            duration: newDuration,
            endDate: endDate.toISOString().split('T')[0],
          };
        }
        return activity;
      }));
      
      // Clear the editing state for this activity
      const newEditing = { ...editingDuration };
      delete newEditing[id];
      setEditingDuration(newEditing);
    }
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
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-border">
        <h1 className="text-[#1a5276]">{project ? 'Edit Project' : 'Create New Project'}</h1>
        <Button onClick={onCancel} variant="secondary">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <Card>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="report">Report Content</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic">
                {/* Basic Information */}
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
                    <Info className="w-5 h-5" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <Label htmlFor="project-name">Project Name *</Label>
                      <Input
                        id="project-name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-number">Project Number *</Label>
                      <Input
                        id="project-number"
                        value={formData.number}
                        onChange={(e) => handleChange('number', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <Label htmlFor="project-location">Location *</Label>
                      <Input
                        id="project-location"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contract-amount">Contract Amount *</Label>
                      <Input
                        id="contract-amount"
                        value={formData.contractAmount}
                        onChange={(e) => handleChange('contractAmount', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="project-description">Project Description</Label>
                    <Textarea
                      id="project-description"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="min-h-[120px]"
                    />
                  </div>

                  {/* Project Timeline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <div>
                      <Label htmlFor="start-date">Start Date *</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          value={formData.duration}
                          onChange={(e) => handleChange('duration', e.target.value)}
                          placeholder="Enter duration"
                          className="flex-1"
                          required
                        />
                        <Select
                          value={formData.durationUnit}
                          onValueChange={(value) => handleChange('durationUnit', value)}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <div>
                      <Label htmlFor="expected-completion">Expected Completion</Label>
                      <Input
                        id="expected-completion"
                        type="text"
                        value={formData.expectedCompletionDate ? new Date(formData.expectedCompletionDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        }) : ''}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="defects-liability-period">Defects Liability Period</Label>
                      <Input
                        id="defects-liability-period"
                        type="text"
                        value={formData.defectsLiabilityPeriod}
                        onChange={(e) => handleChange('defectsLiabilityPeriod', e.target.value)}
                        placeholder="e.g., 12 months, 1 year"
                      />
                    </div>
                  </div>
                </div>

                {/* Client */}
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
                    <Building className="w-5 h-5" />
                    Client
                  </h3>
                  
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="details">Client Details</TabsTrigger>
                      <TabsTrigger value="personnel">Personnel</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                          <Label htmlFor="client-name">Client Name *</Label>
                          <Input
                            id="client-name"
                            value={formData.clientName}
                            onChange={(e) => handleChange('clientName', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="client-contact">Contact Person</Label>
                          <Input
                            id="client-contact"
                            value={formData.clientContact}
                            onChange={(e) => handleChange('clientContact', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                          <Label htmlFor="client-email">Email</Label>
                          <Input
                            id="client-email"
                            type="email"
                            value={formData.clientEmail}
                            onChange={(e) => handleChange('clientEmail', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="client-phone">Phone</Label>
                          <Input
                            id="client-phone"
                            value={formData.clientPhone}
                            onChange={(e) => handleChange('clientPhone', e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="client-address">Address</Label>
                        <Textarea
                          id="client-address"
                          value={formData.clientAddress}
                          onChange={(e) => handleChange('clientAddress', e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-logo">Client Logo (Optional)</Label>
                        <Input
                          id="client-logo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                handleChange('clientLogo', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="cursor-pointer"
                        />
                        {formData.clientLogo && (
                          <div className="mt-2">
                            <img 
                              src={formData.clientLogo} 
                              alt="Client logo preview" 
                              className="h-16 w-auto object-contain border rounded p-2"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="personnel">
                      {clientPersonnel.length > 0 && (
                        <div className="mb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Qualification</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead className="w-20">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clientPersonnel.map((person) => (
                                <TableRow key={person.id}>
                                  <TableCell>{person.name}</TableCell>
                                  <TableCell>{person.qualification}</TableCell>
                                  <TableCell>{person.designation}</TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeClientPersonnel(person.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div>
                          <Label className="text-sm">Name</Label>
                          <Input
                            placeholder="e.g., John Smith"
                            value={newClientPersonnel.name}
                            onChange={(e) => setNewClientPersonnel({ ...newClientPersonnel, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Qualification</Label>
                          <Input
                            placeholder="e.g., B.Eng Civil"
                            value={newClientPersonnel.qualification}
                            onChange={(e) => setNewClientPersonnel({ ...newClientPersonnel, qualification: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Designation</Label>
                          <Input
                            placeholder="e.g., Project Supervisor"
                            value={newClientPersonnel.designation}
                            onChange={(e) => setNewClientPersonnel({ ...newClientPersonnel, designation: e.target.value })}
                          />
                        </div>
                        <div>
                          <Button 
                            type="button" 
                            onClick={addClientPersonnel}
                            className="w-full bg-[#3498db] hover:bg-[#3498db]/90"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Personnel
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Contractor Details */}
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
                    <HardHat className="w-5 h-5" />
                    Contractor
                  </h3>
                  
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="details">Contractor Details</TabsTrigger>
                      <TabsTrigger value="personnel">Personnel</TabsTrigger>
                      <TabsTrigger value="equipment">Equipment</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                          <Label htmlFor="contractor-name">Contractor Name *</Label>
                          <Input
                            id="contractor-name"
                            value={formData.contractorName}
                            onChange={(e) => handleChange('contractorName', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="contractor-contact">Contact Person</Label>
                          <Input
                            id="contractor-contact"
                            value={formData.contractorContact}
                            onChange={(e) => handleChange('contractorContact', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <Label htmlFor="contractor-email">Email</Label>
                          <Input
                            id="contractor-email"
                            type="email"
                            value={formData.contractorEmail}
                            onChange={(e) => handleChange('contractorEmail', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="contractor-phone">Phone</Label>
                          <Input
                            id="contractor-phone"
                            value={formData.contractorPhone}
                            onChange={(e) => handleChange('contractorPhone', e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="personnel">
                      {contractorPersonnel.length > 0 && (
                        <div className="mb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Qualification</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead className="w-20">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {contractorPersonnel.map((person) => (
                                <TableRow key={person.id}>
                                  <TableCell>{person.name}</TableCell>
                                  <TableCell>{person.qualification}</TableCell>
                                  <TableCell>{person.designation}</TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removePersonnel(person.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div>
                          <Label className="text-sm">Name</Label>
                          <Input
                            placeholder="Full name"
                            value={newPersonnel.name}
                            onChange={(e) => setNewPersonnel({ ...newPersonnel, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Qualification</Label>
                          <Input
                            placeholder="e.g., B.Eng Civil"
                            value={newPersonnel.qualification}
                            onChange={(e) => setNewPersonnel({ ...newPersonnel, qualification: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Designation</Label>
                          <Input
                            placeholder="e.g., Site Engineer"
                            value={newPersonnel.designation}
                            onChange={(e) => setNewPersonnel({ ...newPersonnel, designation: e.target.value })}
                          />
                        </div>
                        <div>
                          <Button 
                            type="button" 
                            onClick={addPersonnel}
                            className="w-full bg-[#3498db] hover:bg-[#3498db]/90"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Personnel
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="equipment">
                      {contractorEquipment.length > 0 && (
                        <div className="mb-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Equipment Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Condition</TableHead>
                                <TableHead className="w-20">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {contractorEquipment.map((equip) => (
                                <TableRow key={equip.id}>
                                  <TableCell>{equip.name}</TableCell>
                                  <TableCell>{equip.type}</TableCell>
                                  <TableCell>{equip.quantity}</TableCell>
                                  <TableCell>{equip.condition}</TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeEquipment(equip.id)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div>
                          <Label className="text-sm">Equipment Name</Label>
                          <Input
                            placeholder="e.g., Excavator"
                            value={newEquipment.name}
                            onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Type</Label>
                          <Input
                            placeholder="e.g., Heavy machinery"
                            value={newEquipment.type}
                            onChange={(e) => setNewEquipment({ ...newEquipment, type: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={newEquipment.quantity}
                            onChange={(e) => setNewEquipment({ ...newEquipment, quantity: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Condition</Label>
                          <Input
                            placeholder="e.g., Good"
                            value={newEquipment.condition}
                            onChange={(e) => setNewEquipment({ ...newEquipment, condition: e.target.value })}
                          />
                        </div>
                        <div>
                          <Button 
                            type="button" 
                            onClick={addEquipment}
                            className="w-full bg-[#3498db] hover:bg-[#3498db]/90"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Equipment
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Project Scope */}
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
                    <ListTodo className="w-5 h-5" />
                    Project Scope
                  </h3>
                  <div>
                    <Label htmlFor="project-scope">Scope of Work</Label>
                    <RichTextEditor
                      value={formData.scope}
                      onChange={(value) => handleChange('scope', value)}
                      placeholder="Enter project scope. Use toolbar to add bullet points or numbered lists."
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Report Content Tab */}
              <TabsContent value="report">
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
                    <FileText className="w-5 h-5" />
                    Executive Summary
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This section will appear as "1.1 Project Summary" in progress reports. Describe the project background, objectives, and overview.
                  </p>
                  <RichTextEditor
                    value={executiveSummary}
                    onChange={setExecutiveSummary}
                    placeholder="Enter the executive summary / project introduction. Use the toolbar to format text with bullet points or numbered lists."
                    className="mt-2"
                  />
                </div>

                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
                    <FileText className="w-5 h-5" />
                    Location and Extents of Works
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This section will appear as "1.2 Location and Extents of Works" in progress reports. Describe the project location and scope of works.
                  </p>
                  <RichTextEditor
                    value={locationAndExtent}
                    onChange={setLocationAndExtent}
                    placeholder="Enter the location details and extents of works. Use the toolbar to format text with bullet points or numbered lists."
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              {/* Issues and Concerns Tab */}
              <TabsContent value="issues">
                <div className="mb-8">
                  <h3 className="flex items-center gap-2 text-[#1a5276] mb-5 pb-3 border-b border-border">
                    <AlertCircle className="w-5 h-5" />
                    {editingIssueId ? 'Edit Issue' : 'Add / Edit Issue'}
                  </h3>

                  {/* Add/Edit Issue Form */}
                  <div className="bg-muted/30 p-5 rounded-lg mb-8">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="issue-description">Issue / Concern</Label>
                        <Textarea
                          id="issue-description"
                          placeholder="Describe the issue succinctly..."
                          value={newIssue.description}
                          onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                          className="mt-2 min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="issue-status">Status</Label>
                          <Select
                            value={newIssue.status}
                            onValueChange={(value: 'outstanding' | 'resolved') => setNewIssue({ ...newIssue, status: value })}
                            disabled={!editingIssueId}
                          >
                            <SelectTrigger id="issue-status" className="mt-2">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="outstanding">Outstanding</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="issue-date">Date Captured</Label>
                          <Input
                            id="issue-date"
                            type="date"
                            value={newIssue.dateCaptured}
                            onChange={(e) => setNewIssue({ ...newIssue, dateCaptured: e.target.value })}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="issue-comment">Comment (optional)</Label>
                        <Textarea
                          id="issue-comment"
                          placeholder="Add context, blocking factors, stakeholders involved..."
                          value={newIssue.comment}
                          onChange={(e) => setNewIssue({ ...newIssue, comment: e.target.value })}
                          className="mt-2 min-h-[100px]"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        {editingIssueId && (
                          <Button type="button" variant="outline" onClick={cancelEditIssue}>
                            Cancel
                          </Button>
                        )}
                        <Button 
                          type="button" 
                          onClick={addOrUpdateIssue}
                          className="bg-[#6c757d] hover:bg-[#5a6268]"
                          disabled={!newIssue.description.trim()}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {editingIssueId ? 'Update Issue' : 'Save Issue'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Logged Issues */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4>Logged Issues</h4>
                      <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={issueFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setIssueFilter('all')}
                            className={issueFilter === 'all' ? 'bg-[#1a5276] hover:bg-[#14455f]' : ''}
                          >
                            All
                          </Button>
                          <Button
                            type="button"
                            variant={issueFilter === 'outstanding' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setIssueFilter('outstanding')}
                            className={issueFilter === 'outstanding' ? 'bg-[#1a5276] hover:bg-[#14455f]' : ''}
                          >
                            Outstanding
                          </Button>
                          <Button
                            type="button"
                            variant={issueFilter === 'resolved' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setIssueFilter('resolved')}
                            className={issueFilter === 'resolved' ? 'bg-[#1a5276] hover:bg-[#14455f]' : ''}
                          >
                            Resolved
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Issues List */}
                    {getFilteredIssues().length > 0 ? (
                      <div className="space-y-4">
                        {getFilteredIssues().map((issue) => (
                          <Card key={issue.id} className="border-l-4" style={{ borderLeftColor: issue.status === 'resolved' ? '#27ae60' : '#f39c12' }}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <h4 className="flex-1">{issue.description}</h4>
                                  {issue.status === 'outstanding' ? (
                                    <Badge className="bg-[#f39c12] hover:bg-[#e67e22] text-white">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Outstanding
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-[#27ae60] hover:bg-[#229954] text-white">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Captured: {issue.dateCaptured}
                                </span>
                                {issue.resolvedDate && (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Resolved: {issue.resolvedDate}
                                  </span>
                                )}
                              </div>

                              {issue.comment && (
                                <p className="text-sm mb-3">
                                  <strong>Comment:</strong> {issue.comment}
                                </p>
                              )}

                              {issue.resolutionNotes && (
                                <p className="text-sm mb-3">
                                  <strong>Resolution Notes:</strong> {issue.resolutionNotes}
                                </p>
                              )}

                              <div className="flex gap-2 mt-4">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => editIssue(issue)}
                                >
                                  <Edit2 className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                {issue.status === 'outstanding' ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const notes = prompt('Enter resolution notes (optional):');
                                      if (notes !== null) {
                                        resolveIssue(issue.id, notes);
                                      }
                                    }}
                                    className="bg-[#1e3a4f] text-white hover:bg-[#14455f] border-[#1e3a4f]"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Mark Resolved
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => reopenIssue(issue.id)}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Reopen
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => removeIssue(issue.id)}
                                  className="bg-[#dc3545] hover:bg-[#c82333] text-white"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {issueFilter === 'all' ? 'No issues recorded. Great!' : `No ${issueFilter} issues.`}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-5 border-t border-border">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1a5276] hover:bg-[#14455f]">
                Save Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}