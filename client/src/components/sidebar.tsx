import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderKanban, BarChart3, Settings, Briefcase, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { path: "/reports", label: "Reports", icon: BarChart3, testId: "nav-reports" },
    { path: "/team", label: "Team", icon: Users, testId: "nav-team" },
  ];

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      {/* Logo/Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-200">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900" data-testid="app-title">Keystone Inc.</h1>
          <p className="text-xs text-gray-500">Workspace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.path);

          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={item.testId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-[#0EA5E9] text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Settings at Bottom */}
      <div className="p-3 border-t border-gray-200">
        <Link href="/settings">
          <div
            data-testid="nav-settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
              location.startsWith("/settings")
                ? "bg-[#0EA5E9] text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium text-sm">Settings</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
