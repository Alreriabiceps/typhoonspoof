import React from 'react';
import { NavPage } from '../types';
import {
  Film,
  FolderKanban,
  History,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

interface SidebarProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  activeJobCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  activeJobCount = 0,
}) => {
  const navItems: { id: NavPage; label: string; icon: React.ElementType }[] = [
    { id: 'generator', label: 'Generator', icon: Film },
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-56 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between select-none h-screen"
    >
      <div>
        {/* Brand */}
        <div className="h-14 px-5 border-b border-zinc-800 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-900 flex items-center justify-center font-bold text-xs">
            <Film className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm text-zinc-100 tracking-tight">
            Variant Studio
          </span>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span>{item.label}</span>
                </div>
                {item.id === 'generator' && activeJobCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-900 text-[11px] text-zinc-500">
        Video Variant Generator
      </div>
    </aside>
  );
};
