import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <AppLayout breadcrumb={<h1 className="text-xl font-semibold">Settings</h1>}>
      <div className="p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <SettingsIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Coming soon - Application settings and preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section will include user preferences, notification settings, team management, 
              and system configuration options.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
