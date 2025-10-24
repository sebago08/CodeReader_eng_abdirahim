import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, UserPlus, Trash2, Crown } from "lucide-react";
import type { User } from "@shared/schema";

interface TeamMember {
  id: string;
  user: User;
  role: string;
  createdAt: Date;
}

interface TeamTabProps {
  projectId: string;
  isOwner: boolean;
}

export default function TeamTab({ projectId, isOwner }: TeamTabProps) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");

  const { data: teamData } = useQuery<{ members: TeamMember[]; owner: User | null }>({
    queryKey: [`/api/projects/${projectId}/members`],
  });

  const inviteMutation = useMutation({
    mutationFn: async (username: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/members/invite`, { username });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
      toast({
        title: "Success",
        description: "User added to project successfully",
      });
      setUsername("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/members`] });
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      inviteMutation.mutate(username.trim());
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      removeMemberMutation.mutate(memberId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Form - Only for owners */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Collaborator
            </CardTitle>
            <CardDescription>
              Add team members to collaborate on this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-invite-username"
              />
              <Button 
                type="submit" 
                disabled={inviteMutation.isPending || !username.trim()}
                data-testid="button-invite-member"
              >
                {inviteMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            People who have access to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Owner */}
            {teamData?.owner && (
              <div 
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                data-testid={`member-${teamData.owner.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {teamData.owner.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{teamData.owner.username}</p>
                    <p className="text-sm text-muted-foreground">{teamData.owner.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-amber-600">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm font-medium">Owner</span>
                </div>
              </div>
            )}

            {/* Collaborators */}
            {teamData?.members && teamData.members.length > 0 ? (
              teamData.members.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`member-${member.user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-semibold">
                      {member.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.user.username}</p>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Collaborator</span>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        data-testid={`button-remove-${member.user.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              !teamData?.owner && (
                <p className="text-center text-muted-foreground py-8">
                  No team members yet
                </p>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
