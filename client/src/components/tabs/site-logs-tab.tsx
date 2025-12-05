import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Plus, FileText, AlertCircle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { DailyLogDialog } from "@/components/daily-log-dialog";
import { ActionPointDialog } from "@/components/action-point-dialog";
import type { DailyLog, ActionPoint, DailyLogWithActionPoints } from "@shared/schema";

interface SiteLogsTabProps {
  projectId: string;
}

// Helper function to strip HTML tags and get plain text
const stripHtml = (html: string | null): string => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export function SiteLogsTab({ projectId }: SiteLogsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"daily-logs" | "action-points">("daily-logs");
  const [dailyLogDialogOpen, setDailyLogDialogOpen] = useState(false);
  const [actionPointDialogOpen, setActionPointDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLogWithActionPoints | undefined>(undefined);
  const [editingActionPoint, setEditingActionPoint] = useState<ActionPoint | undefined>(undefined);
  const { toast } = useToast();

  // Fetch daily logs with action points
  const { data: dailyLogs = [], isLoading: logsLoading } = useQuery<DailyLogWithActionPoints[]>({
    queryKey: ['/api/projects', projectId, 'daily-logs'],
  });

  // Fetch action points
  const { data: actionPoints = [], isLoading: pointsLoading } = useQuery<ActionPoint[]>({
    queryKey: ['/api/projects', projectId, 'action-points'],
  });

  const handleAddLog = () => {
    setEditingLog(undefined);
    setDailyLogDialogOpen(true);
  };

  const handleEditLog = (log: DailyLogWithActionPoints) => {
    setEditingLog(log);
    setDailyLogDialogOpen(true);
  };

  const handleAddActionPoint = () => {
    setEditingActionPoint(undefined);
    setActionPointDialogOpen(true);
  };

  const handleEditActionPoint = (actionPoint: ActionPoint) => {
    setEditingActionPoint(actionPoint);
    setActionPointDialogOpen(true);
  };

  const handleCloseDailyLogDialog = () => {
    setDailyLogDialogOpen(false);
    setEditingLog(undefined);
  };

  const handleCloseActionPointDialog = () => {
    setActionPointDialogOpen(false);
    setEditingActionPoint(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-muted">
        <button
          type="button"
          onClick={() => setActiveSubTab("daily-logs")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSubTab === "daily-logs"
              ? "text-foreground border-b-2 border-[#0EA5E9]"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="button-daily-logs-subtab"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Daily Logs
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("action-points")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSubTab === "action-points"
              ? "text-foreground border-b-2 border-[#0EA5E9]"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="button-action-points-subtab"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Action Points
            {actionPoints.filter(ap => ap.status === 'open').length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {actionPoints.filter(ap => ap.status === 'open').length}
              </Badge>
            )}
          </div>
        </button>
      </div>

      {/* Daily Logs Content */}
      {activeSubTab === "daily-logs" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Daily Site Logs</h3>
              <p className="text-sm text-muted-foreground">Record daily activities, weather, and site observations</p>
            </div>
            <Button 
              onClick={handleAddLog}
              data-testid="button-add-daily-log"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Log
            </Button>
          </div>

          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
          ) : dailyLogs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No daily logs yet</p>
                <p className="text-sm text-muted-foreground">Start documenting your daily site activities</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dailyLogs.map((log) => (
                <Card 
                  key={log.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEditLog(log)}
                  data-testid={`card-daily-log-${log.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {format(new Date(log.date), 'EEEE, MMMM d, yyyy')}
                          </span>
                          {log.weather && (
                            <Badge variant="outline" className="text-xs">
                              {log.weather}
                            </Badge>
                          )}
                        </div>
                        {log.workSummary && (
                          <p className="text-sm text-foreground mb-2 line-clamp-2">
                            {stripHtml(log.workSummary)}
                          </p>
                        )}
                        {log.issues && (
                          <div className="flex items-start gap-2 mt-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-400 line-clamp-1">{stripHtml(log.issues)}</p>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Points Content */}
      {activeSubTab === "action-points" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Action Points</h3>
              <p className="text-sm text-muted-foreground">Track follow-up tasks and action items</p>
            </div>
            <Button 
              onClick={handleAddActionPoint}
              data-testid="button-add-action-point"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Action Point
            </Button>
          </div>

          {pointsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading action points...</div>
          ) : actionPoints.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No action points yet</p>
                <p className="text-sm text-muted-foreground">Create action points to track tasks and follow-ups</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {actionPoints.map((point) => (
                <Card 
                  key={point.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEditActionPoint(point)}
                  data-testid={`card-action-point-${point.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="pt-1">
                          {point.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant={
                                point.priority === 'high' ? 'destructive' :
                                point.priority === 'medium' ? 'default' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {point.priority}
                            </Badge>
                            <Badge 
                              variant={point.status === 'completed' ? 'outline' : 'default'}
                              className="text-xs"
                            >
                              {point.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground mb-1">{point.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {point.assignedTo && (
                              <span>Assigned to: {point.assignedTo}</span>
                            )}
                            {point.dueDate && (
                              <span>Due: {format(new Date(point.dueDate), 'MMM d, yyyy')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <DailyLogDialog
        open={dailyLogDialogOpen}
        onClose={handleCloseDailyLogDialog}
        projectId={projectId}
        log={editingLog}
      />

      <ActionPointDialog
        open={actionPointDialogOpen}
        onClose={handleCloseActionPointDialog}
        projectId={projectId}
        actionPoint={editingActionPoint}
      />
    </div>
  );
}
