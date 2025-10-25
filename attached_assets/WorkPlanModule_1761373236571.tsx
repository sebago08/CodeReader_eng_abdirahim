'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, List, Trash2, Edit2, Download, FileText, BarChart3, Flag } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { toast } from 'sonner@2.0.3'
import type { WorkPlan, PlannedActivity, BOQ } from '../types/project'
import {
  createWorkPlan,
  createWorkPlanFromBOQ,
  updateWorkPlan,
  deleteWorkPlan,
  getWorkPlans,
  updateActivityProgress,
} from '../lib/actions/work-plans'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'

interface WorkPlanModuleProps {
  projectId: string
  boqs?: BOQ[]
}

export function WorkPlanModule({ projectId, boqs = [] }: WorkPlanModuleProps) {
  const [workPlans, setWorkPlans] = useState<any[]>([])
  const [selectedWorkPlan, setSelectedWorkPlan] = useState<any | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [createMethod, setCreateMethod] = useState<'manual' | 'from-boq'>('manual')

  // Check if projectId is a valid UUID (from database) vs legacy number ID
  const isLegacyProject = !projectId || /^\d+$/.test(projectId)

  // Form states
  const [workPlanName, setWorkPlanName] = useState('')
  const [workPlanDescription, setWorkPlanDescription] = useState('')
  const [selectedBOQId, setSelectedBOQId] = useState('')
  const [activities, setActivities] = useState<PlannedActivity[]>([])
  const [newActivity, setNewActivity] = useState({
    name: '',
    startDate: '',
    duration: 7,
  })

  useEffect(() => {
    if (!isLegacyProject) {
      loadWorkPlans()
    } else {
      setLoading(false)
    }
  }, [projectId, isLegacyProject])

  const loadWorkPlans = async () => {
    try {
      setLoading(true)
      const data = await getWorkPlans(projectId)
      setWorkPlans(data)
      if (data.length > 0 && !selectedWorkPlan) {
        setSelectedWorkPlan(data[0])
      }
    } catch (error) {
      console.error('Error loading work plans:', error)
      toast.error('Failed to load work plans')
    } finally {
      setLoading(false)
    }
  }

  const calculateEndDate = (startDate: string, duration: number): string => {
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + duration)
    return end.toISOString().split('T')[0]
  }

  const handleAddActivity = () => {
    if (newActivity.name && newActivity.startDate && newActivity.duration > 0) {
      const endDate = calculateEndDate(newActivity.startDate, newActivity.duration)
      
      const activity: PlannedActivity = {
        id: `activity-${Date.now()}`,
        name: newActivity.name,
        startDate: newActivity.startDate,
        duration: newActivity.duration,
        endDate,
        isMilestone: false,
        progress: 0,
        order: activities.length,
      }

      setActivities([...activities, activity])
      setNewActivity({ name: '', startDate: '', duration: 7 })
      toast.success('Activity added')
    } else {
      toast.error('Please fill in all activity fields')
    }
  }

  const handleRemoveActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id))
    toast.success('Activity removed')
  }

  const handleCreateWorkPlan = async () => {
    try {
      if (!workPlanName.trim()) {
        toast.error('Please enter a work plan name')
        return
      }

      let workPlanId: string

      if (createMethod === 'from-boq') {
        if (!selectedBOQId) {
          toast.error('Please select a BOQ')
          return
        }
        workPlanId = await createWorkPlanFromBOQ(projectId, selectedBOQId, workPlanName)
        toast.success('Work plan created from BOQ!')
      } else {
        if (activities.length === 0) {
          toast.error('Please add at least one activity')
          return
        }
        workPlanId = await createWorkPlan(projectId, workPlanName, workPlanDescription, activities)
        toast.success('Work plan created successfully!')
      }

      setIsCreateDialogOpen(false)
      resetForm()
      loadWorkPlans()
    } catch (error) {
      console.error('Error creating work plan:', error)
      toast.error('Failed to create work plan')
    }
  }

  const handleUpdateWorkPlan = async () => {
    if (!selectedWorkPlan) return

    try {
      await updateWorkPlan(selectedWorkPlan.id, {
        name: workPlanName,
        description: workPlanDescription,
        activities,
      })
      toast.success('Work plan updated successfully!')
      setIsEditDialogOpen(false)
      resetForm()
      loadWorkPlans()
    } catch (error) {
      console.error('Error updating work plan:', error)
      toast.error('Failed to update work plan')
    }
  }

  const handleDeleteWorkPlan = async (workPlanId: string) => {
    try {
      await deleteWorkPlan(workPlanId)
      toast.success('Work plan deleted successfully!')
      if (selectedWorkPlan?.id === workPlanId) {
        setSelectedWorkPlan(null)
      }
      loadWorkPlans()
    } catch (error) {
      console.error('Error deleting work plan:', error)
      toast.error('Failed to delete work plan')
    }
  }

  const handleUpdateProgress = async (activityId: string, progress: number) => {
    try {
      await updateActivityProgress(activityId, progress)
      toast.success('Progress updated')
      loadWorkPlans()
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    }
  }

  const resetForm = () => {
    setWorkPlanName('')
    setWorkPlanDescription('')
    setActivities([])
    setSelectedBOQId('')
    setCreateMethod('manual')
  }

  const openEditDialog = (workPlan: any) => {
    setWorkPlanName(workPlan.name)
    setWorkPlanDescription(workPlan.description || '')
    
    // Convert database activities to PlannedActivity format
    const dbActivities = workPlan.work_plan_activities || []
    const formattedActivities: PlannedActivity[] = dbActivities.map((act: any) => ({
      id: act.id,
      name: act.name,
      startDate: act.start_date,
      duration: act.duration,
      endDate: act.end_date,
      isMilestone: act.is_milestone,
      progress: act.progress,
      order: act.order,
    }))
    
    setActivities(formattedActivities)
    setIsEditDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const calculateOverallProgress = (activities: any[]) => {
    if (!activities || activities.length === 0) return 0
    const total = activities.reduce((sum, act) => sum + (act.progress || 0), 0)
    return Math.round(total / activities.length)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a5276] mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading work plans...</p>
        </div>
      </div>
    )
  }

  // Show migration message for legacy localStorage projects
  if (isLegacyProject) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-muted-foreground mb-2">Database Migration Required</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Work Plans require your project to be migrated to the Supabase database. 
              Please complete the database migration to use this feature.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 max-w-md mx-auto mt-4">
              <p className="text-sm text-blue-900 text-left">
                <strong>Why migrate?</strong><br />
                • Save work plans with full CRUD operations<br />
                • Extract activities from BOQs<br />
                • Track progress across multiple work plans<br />
                • Access data from anywhere
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="flex items-center gap-2 text-[#1a5276]">
            <Calendar className="w-6 h-6" />
            Work Plans
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage work plans for your project
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1a5276] hover:bg-[#3498db]">
              <Plus className="w-4 h-4 mr-2" />
              Create Work Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Work Plan</DialogTitle>
              <DialogDescription>
                Create a work plan manually or extract activities from a BOQ
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="work-plan-name">Work Plan Name *</Label>
                  <Input
                    id="work-plan-name"
                    placeholder="e.g., Phase 1 Construction"
                    value={workPlanName}
                    onChange={(e) => setWorkPlanName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="work-plan-description">Description</Label>
                  <Textarea
                    id="work-plan-description"
                    placeholder="Enter work plan description..."
                    value={workPlanDescription}
                    onChange={(e) => setWorkPlanDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Creation Method */}
              <div>
                <Label>Creation Method</Label>
                <Tabs value={createMethod} onValueChange={(v) => setCreateMethod(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    <TabsTrigger value="from-boq">From BOQ</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-4">
                      <h4 className="text-sm">Add Activities</h4>
                      
                      {/* Activity List */}
                      {activities.length > 0 && (
                        <div className="space-y-2">
                          {activities.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                              <div className="flex-1">
                                <p>{activity.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(activity.startDate)} - {formatDate(activity.endDate)} ({activity.duration} days)
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveActivity(activity.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Activity Form */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Activity Name</Label>
                          <Input
                            placeholder="e.g., Foundation work"
                            value={newActivity.name}
                            onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="date"
                            value={newActivity.startDate}
                            onChange={(e) => setNewActivity({ ...newActivity, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Duration (days)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newActivity.duration}
                            onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddActivity}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Activity
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="from-boq" className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-4">
                      <div>
                        <Label htmlFor="boq-select">Select BOQ</Label>
                        <Select value={selectedBOQId} onValueChange={setSelectedBOQId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a BOQ to extract activities from" />
                          </SelectTrigger>
                          <SelectContent>
                            {boqs.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No BOQs available. Create a BOQ first.
                              </div>
                            ) : (
                              boqs.map((boq) => (
                                <SelectItem key={boq.id} value={boq.id}>
                                  {boq.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-900">
                          <FileText className="w-4 h-4 inline mr-2" />
                          Activities will be automatically extracted from the selected BOQ items
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkPlan} className="bg-[#1a5276] hover:bg-[#3498db]">
                Create Work Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Work Plans List */}
      {workPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-muted-foreground mb-2">No Work Plans Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first work plan to start planning project activities
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Work Plans List */}
          <div className="col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Saved Work Plans</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {workPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedWorkPlan(plan)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedWorkPlan?.id === plan.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm">{plan.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {plan.work_plan_activities?.length || 0} activities
                          </p>
                          {plan.created_from_boq && (
                            <Badge variant="secondary" className="mt-1">
                              <FileText className="w-3 h-3 mr-1" />
                              From BOQ
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Progress 
                            value={calculateOverallProgress(plan.work_plan_activities || [])} 
                            className="w-12 h-2"
                          />
                          <span className="text-xs text-muted-foreground">
                            {calculateOverallProgress(plan.work_plan_activities || [])}%
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Selected Work Plan Details */}
          <div className="col-span-9">
            {selectedWorkPlan ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedWorkPlan.name}
                        {selectedWorkPlan.created_from_boq && (
                          <Badge variant="secondary">
                            <FileText className="w-3 h-3 mr-1" />
                            From BOQ
                          </Badge>
                        )}
                      </CardTitle>
                      {selectedWorkPlan.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedWorkPlan.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(selectedWorkPlan)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Work Plan</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Work Plan Name</Label>
                              <Input
                                value={workPlanName}
                                onChange={(e) => setWorkPlanName(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={workPlanDescription}
                                onChange={(e) => setWorkPlanDescription(e.target.value)}
                                rows={3}
                              />
                            </div>
                            {/* Activity editing would go here */}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateWorkPlan} className="bg-[#1a5276]">
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Work Plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{selectedWorkPlan.name}" and all its activities. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteWorkPlan(selectedWorkPlan.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Activities Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity Name</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedWorkPlan.work_plan_activities || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No activities in this work plan
                            </TableCell>
                          </TableRow>
                        ) : (
                          (selectedWorkPlan.work_plan_activities || [])
                            .sort((a: any, b: any) => a.order - b.order)
                            .map((activity: any) => (
                              <TableRow key={activity.id}>
                                <TableCell>
                                  {activity.is_milestone && (
                                    <Flag className="w-4 h-4 inline mr-2 text-yellow-500" />
                                  )}
                                  {activity.name}
                                </TableCell>
                                <TableCell>{formatDate(activity.start_date)}</TableCell>
                                <TableCell>{activity.duration} days</TableCell>
                                <TableCell>{formatDate(activity.end_date)}</TableCell>
                                <TableCell>
                                  <Badge variant={activity.is_milestone ? 'default' : 'secondary'}>
                                    {activity.is_milestone ? 'Milestone' : 'Activity'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={activity.progress || 0} className="w-20" />
                                    <span className="text-sm text-muted-foreground w-10">
                                      {activity.progress || 0}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Overall Progress */}
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Overall Progress</span>
                      <span className="text-sm">
                        {calculateOverallProgress(selectedWorkPlan.work_plan_activities || [])}%
                      </span>
                    </div>
                    <Progress 
                      value={calculateOverallProgress(selectedWorkPlan.work_plan_activities || [])} 
                      className="h-3"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <List className="w-12 h-12 mx-auto mb-4" />
                    <p>Select a work plan to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}