import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectWithRoads } from "@shared/schema";

interface TeamMembersWidgetProps {
  project: ProjectWithRoads;
}

// Mock team members data
const mockTeamMembers = [
  { name: "Aisha Mohamed", role: "Project Manager", initials: "AM", color: "bg-blue-600" },
  { name: "Yusuf Ahmed", role: "Lead Engineer", initials: "YA", color: "bg-green-600" },
  { name: "Fatuma Ali", role: "Architect", initials: "FA", color: "bg-purple-600" },
  { name: "Omar Hassan", role: "Site Supervisor", initials: "OH", color: "bg-orange-600" },
];

export default function TeamMembersWidget({ project }: TeamMembersWidgetProps) {
  return (
    <Card data-testid="widget-team-members">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-widget-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockTeamMembers.map((member, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid={`team-member-${index}`}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className={`${member.color} text-white`}>
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold" data-testid={`text-member-name-${index}`}>
                  {member.name}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`text-member-role-${index}`}>
                  {member.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
