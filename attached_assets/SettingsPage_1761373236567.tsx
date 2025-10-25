import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Building2, User, Bell, Lock, Palette, Database } from 'lucide-react';

export function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[#1a5276] mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences and configuration
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1a5276]" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>Update your company details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" placeholder="ConstructPro Inc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Email</Label>
                <Input id="company-email" type="email" placeholder="info@constructpro.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Phone</Label>
                <Input id="company-phone" placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-license">License Number</Label>
                <Input id="company-license" placeholder="LIC-123456" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Address</Label>
              <Input id="company-address" placeholder="123 Construction Ave, Builder City, BC 12345" />
            </div>
            <Button className="bg-[#1a5276] hover:bg-[#14455f]">Save Changes</Button>
          </CardContent>
        </Card>

        {/* User Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#1a5276]" />
              <CardTitle>User Preferences</CardTitle>
            </div>
            <CardDescription>Customize your user experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about project changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show browser notifications for important updates
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-save Forms</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save form progress
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#1a5276]" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="justify-start">
                  Light
                </Button>
                <Button variant="outline" className="justify-start">
                  Dark
                </Button>
                <Button variant="outline" className="justify-start">
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#1a5276]" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button className="bg-[#1a5276] hover:bg-[#14455f]">Update Password</Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#1a5276]" />
              <CardTitle>Data Management</CardTitle>
            </div>
            <CardDescription>Manage your application data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Export Data</Label>
                <p className="text-sm text-muted-foreground">
                  Download all your project data
                </p>
              </div>
              <Button variant="outline">Export</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Data</Label>
                <p className="text-sm text-muted-foreground">
                  Create a backup of your projects
                </p>
              </div>
              <Button variant="outline">Backup</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
