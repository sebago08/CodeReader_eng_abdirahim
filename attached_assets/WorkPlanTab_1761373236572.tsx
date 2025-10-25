'use client';

import { useState, useEffect } from 'react';
import { ListTodo, Plus, Trash2, CheckCircle, X, Flag } from 'lucide-react';
import { PlannedActivity } from '../types/project';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';

interface WorkPlanTabProps {
  projectId: string;
  activities: PlannedActivity[];
  onLocalUpdate?: (activities: PlannedActivity[]) => void;
}

export function WorkPlanTab({ projectId, activities: initialActivities, onLocalUpdate }: WorkPlanTabProps) {
  const [activities, setActivities] = useState<PlannedActivity[]>(initialActivities);
  const [newActivity, setNewActivity] = useState({ name: '', startDate: '', duration: '' });
  const [editingDuration, setEditingDuration] = useState<Record<string, string>>({});

  // LocalStorage key for this project's activities
  const storageKey = `work-plan-activities-${projectId}`;

  // Load activities from localStorage on mount
  useEffect(() => {
    const storedActivities = localStorage.getItem(storageKey);
    if (storedActivities) {
      try {
        const parsed = JSON.parse(storedActivities);
        setActivities(parsed);
      } catch (error) {
        console.error('Error parsing stored activities:', error);
      }
    } else {
      setActivities(initialActivities);
    }
  }, [projectId, storageKey]);

  // Helper function to save activities to localStorage
  const saveActivitiesToStorage = (updatedActivities: PlannedActivity[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedActivities));
      onLocalUpdate?.(updatedActivities);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      toast.error('Failed to save activities');
      return false;
    }
  };

  const calculateEndDate = (startDate: string, duration: number): string => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    return end.toISOString().split('T')[0];
  };

  const addActivity = () => {
    if (!newActivity.name || !newActivity.startDate || !newActivity.duration) {
      toast.error('Please fill in all required fields');
      return;
    }

    const duration = parseInt(newActivity.duration);
    if (isNaN(duration) || duration < 1) {
      toast.error('Duration must be a valid number greater than 0');
      return;
    }

    const endDate = calculateEndDate(newActivity.startDate, duration);

    const activity: PlannedActivity = {
      id: `activity-${Date.now()}`,
      name: newActivity.name,
      startDate: newActivity.startDate,
      duration,
      endDate,
      isMilestone: false,
      progress: 0,
      order: activities.length,
    };

    const updatedActivities = [...activities, activity];
    setActivities(updatedActivities);
    
    if (saveActivitiesToStorage(updatedActivities)) {
      setNewActivity({ name: '', startDate: '', duration: '' });
      toast.success('Activity added successfully');
    } else {
      // Revert on error
      setActivities(activities);
    }
  };

  const removeActivity = (activityId: string) => {
    const updatedActivities = activities.filter(a => a.id !== activityId);
    setActivities(updatedActivities);
    
    if (saveActivitiesToStorage(updatedActivities)) {
      toast.success('Activity removed successfully');
    } else {
      // Revert on error
      setActivities(activities);
    }
  };

  const updateActivityDuration = (activityId: string, newDuration: number) => {
    if (newDuration < 1) {
      toast.error('Duration must be at least 1 day');
      return;
    }

    const updatedActivities = activities.map(a => {
      if (a.id === activityId) {
        const endDate = calculateEndDate(a.startDate, newDuration);
        return { ...a, duration: newDuration, endDate };
      }
      return a;
    });

    setActivities(updatedActivities);
    const newEditing = { ...editingDuration };
    delete newEditing[activityId];
    setEditingDuration(newEditing);

    if (saveActivitiesToStorage(updatedActivities)) {
      toast.success('Duration updated successfully');
    } else {
      // Revert on error
      setActivities(activities);
    }
  };

  const toggleMilestone = (activityId: string) => {
    const updatedActivities = activities.map(a =>
      a.id === activityId ? { ...a, isMilestone: !a.isMilestone } : a
    );
    
    setActivities(updatedActivities);
    
    if (saveActivitiesToStorage(updatedActivities)) {
      toast.success('Milestone status updated');
    } else {
      // Revert on error
      setActivities(activities);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
        <h3 className="flex items-center gap-2 text-[#1a5276]">
          <ListTodo className="w-5 h-5" />
          Planned Activities & Work Schedule
        </h3>
      </div>
      
      {/* Add Activity Form */}
      <div className="bg-muted/30 p-5 rounded-lg mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <Label className="text-sm">Activity Name *</Label>
            <Input
              placeholder="e.g., Site Clearing"
              value={newActivity.name}
              onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm">Start Date *</Label>
            <Input
              type="date"
              value={newActivity.startDate}
              onChange={(e) => setNewActivity({ ...newActivity, startDate: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm">Duration (days) *</Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g., 14"
              value={newActivity.duration}
              onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
            />
          </div>
        </div>
        <Button 
          type="button" 
          onClick={addActivity} 
          className="bg-[#1a5276] hover:bg-[#14455f]"
          disabled={!newActivity.name || !newActivity.startDate || !newActivity.duration}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Activities List */}
      {activities.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{activity.name}</TableCell>
                  <TableCell>{new Date(activity.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {editingDuration[activity.id] !== undefined ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={editingDuration[activity.id]}
                          onChange={(e) => setEditingDuration({ ...editingDuration, [activity.id]: e.target.value })}
                          className="w-20"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => updateActivityDuration(activity.id, parseInt(editingDuration[activity.id]))}
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newEditing = { ...editingDuration };
                            delete newEditing[activity.id];
                            setEditingDuration(newEditing);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <span 
                        onClick={() => setEditingDuration({ ...editingDuration, [activity.id]: activity.duration.toString() })}
                        className="cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors inline-block"
                        title="Click to edit duration"
                      >
                        {activity.duration} days
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(activity.endDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant={activity.isMilestone ? 'default' : 'outline'}
                      onClick={() => toggleMilestone(activity.id)}
                      className={activity.isMilestone ? 'bg-[#3498db] hover:bg-[#3498db]/90' : ''}
                    >
                      <Flag className="w-3 h-3" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeActivity(activity.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <ListTodo className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No activities added yet. Add your first activity above.</p>
        </div>
      )}
    </div>
  );
}
