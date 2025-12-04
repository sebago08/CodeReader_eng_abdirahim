import { useState } from "react";
import { Plus, Search, Grid, List as ListIcon, MoreVertical, Eye, Pencil, Trash2, Copy, Calendar, User, Clock, CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkPlan, User as UserType, WorkPlanActivity } from "@shared/schema";

type WorkPlanWithOwner = WorkPlan & {
  owner?: UserType | null;
};

interface WorkPlanListProps {
  projectId: string;
  projectName: string;
  onCreateClick: () => void;
  onEditClick: (workPlanId: string) => void;
}

export function WorkPlanList({ projectId, projectName, onCreateClick, onEditClick }: WorkPlanListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorkPlan, setSelectedWorkPlan] = useState<WorkPlanWithOwner | null>(null);
  const [workPlanToDelete, setWorkPlanToDelete] = useState<WorkPlanWithOwner | null>(null);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const { data: workPlans = [], isLoading } = useQuery<WorkPlanWithOwner[]>({
    queryKey: ["/api/projects", projectId, "work-plans"],
  });

  const { data: activities = [] } = useQuery<WorkPlanActivity[]>({
    queryKey: ["/api/work-plans", selectedWorkPlan?.id, "activities"],
    enabled: !!selectedWorkPlan,
  });

  const deleteMutation = useMutation({
    mutationFn: async (workPlanId: string) => {
      await apiRequest("DELETE", `/api/work-plans/${workPlanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "work-plans"] });
      toast({
        title: "Work Plan Deleted",
        description: "The work plan has been deleted successfully.",
      });
      setWorkPlanToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete work plan.",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (workPlan: WorkPlanWithOwner) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/work-plans`, {
        name: `${workPlan.name} (Copy)`,
        status: "Not Started",
        description: workPlan.description,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "work-plans"] });
      toast({
        title: "Work Plan Duplicated",
        description: "The work plan has been duplicated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate work plan.",
        variant: "destructive",
      });
    },
  });

  const filteredWorkPlans = workPlans.filter((plan) =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredWorkPlans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWorkPlans = filteredWorkPlans.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-950/20 text-blue-400 border border-blue-800";
      case "Completed":
        return "bg-green-950/20 text-green-400 border border-green-800";
      case "Blocked":
        return "bg-red-950/20 text-red-400 border border-red-800";
      case "Not Started":
        return "bg-muted text-muted-foreground border border-border";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const getTimeAgo = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
    return format(new Date(date), "MMM d, yyyy");
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const handleDuplicate = (workPlan: WorkPlanWithOwner) => {
    duplicateMutation.mutate(workPlan);
  };

  const handleDelete = () => {
    if (workPlanToDelete) {
      deleteMutation.mutate(workPlanToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="work-plan-list-loading">
        <div className="text-muted-foreground">Loading work plans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold" data-testid="work-plan-list-title">
          Work Plans for {projectName}
        </h2>
        <Button onClick={onCreateClick} data-testid="button-create-work-plan">
          <Plus className="mr-2 h-4 w-4" />
          Create New Work Plan
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search work plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-work-plans"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-md p-1 w-fit">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            data-testid="button-grid-view"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            data-testid="button-list-view"
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Work Plans Table */}
      {paginatedWorkPlans.length === 0 ? (
        <div className="text-center py-12 border rounded-lg" data-testid="work-plan-list-empty">
          <p className="text-muted-foreground">
            {searchQuery ? "No work plans found matching your search." : "No work plans yet. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-4 sm:px-6 py-3">Work Plan Name</th>
                <th className="px-4 sm:px-6 py-3">Last Updated</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3">Owner</th>
                <th className="px-4 sm:px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-background divide-y divide-border">
              {paginatedWorkPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-muted/50" data-testid={`work-plan-row-${plan.id}`}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <button
                      className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline cursor-pointer text-left"
                      onClick={() => setSelectedWorkPlan(plan)}
                      data-testid={`work-plan-name-${plan.id}`}
                    >
                      {plan.name}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground" data-testid={`work-plan-updated-${plan.id}`}>
                      {getTimeAgo(plan.updatedAt)}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(plan.status)} data-testid={`work-plan-status-${plan.id}`}>
                      {plan.status}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {plan.owner ? getInitials(plan.owner.firstName, plan.owner.lastName) : "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          data-testid={`button-actions-${plan.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => setSelectedWorkPlan(plan)}
                          data-testid={`menu-view-${plan.id}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEditClick(plan.id)}
                          data-testid={`menu-edit-${plan.id}`}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(plan)}
                          disabled={duplicateMutation.isPending}
                          data-testid={`menu-duplicate-${plan.id}`}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setWorkPlanToDelete(plan)}
                          className="text-red-400 focus:text-red-400"
                          data-testid={`menu-delete-${plan.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
                data-testid={`button-page-${pageNum}`}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}

      {/* View Work Plan Modal */}
      <Dialog open={!!selectedWorkPlan} onOpenChange={(open) => !open && setSelectedWorkPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-5 w-5 text-blue-400" />
              {selectedWorkPlan?.name}
            </DialogTitle>
            <DialogDescription>
              Work plan details and activities
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedWorkPlan && (
              <div className="space-y-6">
                {/* Status and Meta Info */}
                <div className="flex flex-wrap gap-3">
                  <Badge className={getStatusColor(selectedWorkPlan.status)}>
                    {selectedWorkPlan.status}
                  </Badge>
                </div>

                <Separator />

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="text-sm text-foreground">
                        {selectedWorkPlan.owner 
                          ? `${selectedWorkPlan.owner.firstName || ''} ${selectedWorkPlan.owner.lastName || ''}`.trim() || 'Unassigned'
                          : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm text-foreground">
                        {getTimeAgo(selectedWorkPlan.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {selectedWorkPlan.createdAt && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm text-foreground">
                          {format(new Date(selectedWorkPlan.createdAt), 'PPP')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedWorkPlan.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedWorkPlan.description}
                      </p>
                    </div>
                  </>
                )}

                {/* Activities Section */}
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Activities ({activities.length})</p>
                  </div>
                  
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No activities defined yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.slice(0, 10).map((activity) => (
                        <div 
                          key={activity.id}
                          className="p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {activity.activityName}
                              </p>
                              {activity.itemType === 'section' && (
                                <p className="text-xs text-muted-foreground">
                                  Section header
                                </p>
                              )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                              {activity.duration && <span>{activity.duration} days</span>}
                            </div>
                          </div>
                          {(activity.startDate || activity.endDate) && (
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {activity.startDate && (
                                <span>Start: {format(new Date(activity.startDate), 'MMM d, yyyy')}</span>
                              )}
                              {activity.endDate && (
                                <span>End: {format(new Date(activity.endDate), 'MMM d, yyyy')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {activities.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          ... and {activities.length - 10} more activities
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!workPlanToDelete} onOpenChange={(open) => !open && setWorkPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workPlanToDelete?.name}"? This action cannot be undone and will remove all associated activities and progress data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
