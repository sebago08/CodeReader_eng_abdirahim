import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, XCircle, LogOut, Shield } from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { logoutMutation, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const handleApprove = async (userId: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/approve`);
      toast({
        title: "Success",
        description: "User approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm("Are you sure you want to reject this user? This will delete their account.")) {
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
      toast({
        title: "Success",
        description: "User rejected and deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const filteredUsers = users?.filter(user => {
    if (activeTab === "pending") return !user.isApproved;
    if (activeTab === "approved") return user.isApproved;
    return true;
  }) || [];

  const pendingCount = users?.filter(u => !u.isApproved).length || 0;
  const approvedCount = users?.filter(u => u.isApproved).length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage user approvals</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-card-foreground">{currentUser?.username}</div>
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all" data-testid="tab-all-users">
                  All Users ({users?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending-users">
                  Pending ({pendingCount})
                </TabsTrigger>
                <TabsTrigger value="approved" data-testid="tab-approved-users">
                  Approved ({approvedCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No users found in this category
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        data-testid={`user-card-${user.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-card-foreground">{user.username}</h3>
                            {user.isAdmin && (
                              <Badge variant="destructive">Admin</Badge>
                            )}
                            {user.isApproved ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Email: {user.email}</div>
                            {(user.firstName || user.lastName) && (
                              <div>
                                Name: {user.firstName} {user.lastName}
                              </div>
                            )}
                            <div>
                              Registered: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                            </div>
                          </div>
                        </div>
                        {!user.isApproved && !user.isAdmin && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleApprove(user.id)}
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-approve-${user.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(user.id)}
                              variant="destructive"
                              size="sm"
                              data-testid={`button-reject-${user.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {user.isApproved && (
                          <div className="text-sm text-green-600 font-medium">
                            ✓ Approved
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
