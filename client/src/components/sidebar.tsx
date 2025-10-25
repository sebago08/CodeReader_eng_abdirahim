import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderKanban, BarChart3, Settings, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { path: "/projects", label: "Projects", icon: FolderKanban, testId: "nav-projects" },
    { path: "/reports", label: "Reports", icon: BarChart3, testId: "nav-reports" },
    { path: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
  ];

  return (
    <div className="h-screen w-64 bg-[#1e3a4f] text-white flex flex-col fixed left-0 top-0">
      {/* Logo/Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-[#2d5366]">
        <div className="w-8 h-8 bg-[#3a5f7d] rounded flex items-center justify-center">
          <Briefcase className="w-5 h-5" />
        </div>
        <h1 className="text-lg font-semibold" data-testid="app-title">ConstructTrack</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
                    ? "bg-[#2d5366] text-white"
                    : "text-gray-300 hover:bg-[#2d5366]/50 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
