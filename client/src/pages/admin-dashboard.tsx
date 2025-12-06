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
import { 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  Shield, 
  UserX, 
  UserCheck, 
  Crown,
  ChevronDown,
  Trash2,
  UserCog
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { logout, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const isSuperAdmin = currentUser?.isSuperAdmin;

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

  const handleDeactivate = async (userId: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/deactivate`);
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      });
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/promote`);
      toast({
        title: "Success",
        description: "User promoted to admin successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to promote user",
        variant: "destructive",
      });
    }
  };

  const handleDemote = async (userId: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/demote`);
      toast({
        title: "Success",
        description: "User demoted from admin successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to demote user",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    try {
      await apiRequest("DELETE", `/api/admin/users/${userToDelete.id}`);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const filteredUsers = users?.filter(user => {
    if (activeTab === "pending") return !user.isApproved;
    if (activeTab === "approved") return user.isApproved;
    if (activeTab === "admins") return user.isAdmin || user.isSuperAdmin;
    return true;
  }) || [];

  const pendingCount = users?.filter(u => !u.isApproved).length || 0;
  const approvedCount = users?.filter(u => u.isApproved).length || 0;
  const adminCount = users?.filter(u => u.isAdmin || u.isSuperAdmin).length || 0;

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
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin ? "Super Admin - Full user management" : "Manage user approvals"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-card-foreground">{currentUser?.firstName || currentUser?.email}</div>
              <Badge variant={isSuperAdmin ? "default" : "secondary"} className={isSuperAdmin ? "bg-purple-600" : ""}>
                {isSuperAdmin && <Crown className="w-3 h-3 mr-1" />}
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </Badge>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Administrators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{adminCount}</div>
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
                  Active ({approvedCount})
                </TabsTrigger>
                <TabsTrigger value="admins" data-testid="tab-admin-users">
                  Admins ({adminCount})
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
                            <h3 className="font-semibold text-card-foreground">{user.firstName || user.email}</h3>
                            {user.isSuperAdmin && (
                              <Badge className="bg-purple-600">
                                <Crown className="w-3 h-3 mr-1" />
                                Super Admin
                              </Badge>
                            )}
                            {user.isAdmin && !user.isSuperAdmin && (
                              <Badge variant="destructive">Admin</Badge>
                            )}
                            {user.isApproved ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
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
                        
                        {/* Actions - Only show for non-super-admin users and not for self */}
                        {user.id !== currentUser?.id && !user.isSuperAdmin && isSuperAdmin && (
                          <div className="flex items-center space-x-2">
                            {!user.isApproved ? (
                              <>
                                <Button
                                  onClick={() => handleApprove(user.id)}
                                  variant="default"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid={`button-approve-${user.id}`}
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => confirmDelete(user)}
                                  variant="destructive"
                                  size="sm"
                                  data-testid={`button-reject-${user.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <UserCog className="w-4 h-4 mr-2" />
                                    Manage
                                    <ChevronDown className="w-4 h-4 ml-2" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!user.isAdmin ? (
                                    <DropdownMenuItem onClick={() => handlePromote(user.id)}>
                                      <Crown className="w-4 h-4 mr-2" />
                                      Promote to Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleDemote(user.id)}>
                                      <UserX className="w-4 h-4 mr-2" />
                                      Demote from Admin
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleDeactivate(user.id)}>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Deactivate Account
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => confirmDelete(user)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        )}

                        {/* Show current user indicator */}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline">You</Badge>
                        )}

                        {/* Show status for super admins */}
                        {user.isSuperAdmin && user.id !== currentUser?.id && (
                          <Badge variant="outline" className="text-purple-600">
                            Protected
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Info card for non-super admins */}
        {!isSuperAdmin && (
          <Card className="mt-4 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> As a regular admin, you can view users but cannot make changes. 
                Contact a Super Admin to manage user roles and approvals.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user "{userToDelete?.firstName || userToDelete?.email}"? 
              This action cannot be undone and will permanently remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
