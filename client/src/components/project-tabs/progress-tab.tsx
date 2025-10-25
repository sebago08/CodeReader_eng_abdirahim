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
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertActivitySchema } from "@shared/schema";
import type { Activity, ProjectWithRoads } from "@shared/schema";
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
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-financial">Financial</CardTitle>
              <CardDescription>Track project costs and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>Financial tracking feature coming soon.</p>
              </div>
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
