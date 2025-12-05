import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Crown } from "lucide-react";

export default function Bootstrap() {
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [makeSuperAdmin, setMakeSuperAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/bootstrap/promote-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, secret, makeSuperAdmin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to promote user");
      }

      toast({
        title: "Success!",
        description: data.message,
      });

      setSecret("");
      setUsername("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-500" />
            <CardTitle className="text-2xl">Admin Bootstrap</CardTitle>
          </div>
          <CardDescription>
            Promote an existing user to admin or super admin. This should only be used once to create the first admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePromote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username of registered user"
                required
                data-testid="input-username"
              />
              <p className="text-xs text-muted-foreground">
                User must already be registered in the system
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret">Bootstrap Secret</Label>
              <Input
                id="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter bootstrap secret"
                required
                data-testid="input-secret"
              />
              <p className="text-xs text-muted-foreground">
                Default secret: constructtrack-admin-2024
              </p>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <Checkbox
                id="superAdmin"
                checked={makeSuperAdmin}
                onCheckedChange={(checked) => setMakeSuperAdmin(checked === true)}
                data-testid="checkbox-super-admin"
              />
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-600" />
                <Label htmlFor="superAdmin" className="text-sm font-medium cursor-pointer">
                  Make Super Admin
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Super Admins can approve users, manage roles, and delete accounts
            </p>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-promote"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Promoting...
                </>
              ) : (
                <>
                  {makeSuperAdmin && <Crown className="mr-2 h-4 w-4" />}
                  {makeSuperAdmin ? "Promote to Super Admin" : "Promote to Admin"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
