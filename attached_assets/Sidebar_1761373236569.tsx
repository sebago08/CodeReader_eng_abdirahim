import { HardHat, LayoutDashboard, FolderKanban, FileText, BarChart3, Settings } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'projects', icon: FolderKanban, label: 'Projects' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-[#1a5276] to-[#14455f] text-white h-screen fixed overflow-y-auto print:hidden">
      <div className="p-5 text-center border-b border-white/10">
        <h2 className="flex items-center justify-center gap-2">
          <HardHat className="w-6 h-6" />
          <span>ConstructPro</span>
        </h2>
      </div>
      <ul className="py-5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <li key={item.id} className="mb-1">
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-white/80 hover:text-white hover:bg-white/10 transition-all ${
                  isActive ? 'bg-white/10 text-white border-l-4 border-[#3498db]' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
