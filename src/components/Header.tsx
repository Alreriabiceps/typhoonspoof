import React from 'react';
import { NavPage } from '../types';
import { Plus } from 'lucide-react';

interface HeaderProps {
  activePage: NavPage;
  onNavigateToGenerator?: () => void;
  activeProjectName?: string;
  hasActiveJob?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateToGenerator,
  activeProjectName,
  hasActiveJob,
}) => {
  return (
    <header
      id="app-main-header"
      className="h-14 flex-shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between z-10"
    >
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-zinc-100">
          Video Variant Generator
        </h1>
        {activeProjectName && (
          <span className="hidden sm:inline-flex items-center text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md max-w-[220px] truncate">
            {activeProjectName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {hasActiveJob && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Generating</span>
          </div>
        )}

        {onNavigateToGenerator && (
          <button
            id="header-quick-generate-btn"
            onClick={onNavigateToGenerator}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Generation</span>
          </button>
        )}
      </div>
    </header>
  );
};
