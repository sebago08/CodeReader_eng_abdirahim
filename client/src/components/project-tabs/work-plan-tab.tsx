import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { WorkPlanList } from "./work-plan-list";
import { WorkPlanCreateModal } from "./work-plan-create-modal";

interface WorkPlanTabProps {
  projectId: string;
}

export default function WorkPlanTab({ projectId }: WorkPlanTabProps) {
  const [, navigate] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  const handleEditClick = (workPlanId: string) => {
    navigate(`/work-plans/${workPlanId}`);
  };

  const handleCreateSuccess = () => {
    // Modal will close automatically, list will refresh
  };

  return (
    <>
      <WorkPlanList
        projectId={projectId}
        projectName={project?.name || "Project"}
        onCreateClick={() => setIsCreateModalOpen(true)}
        onEditClick={handleEditClick}
      />

      <WorkPlanCreateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
