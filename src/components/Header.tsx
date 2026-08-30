import React from 'react';

interface HeaderProps {
  activeProjectName?: string;
  hasActiveJob?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
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

      {hasActiveJob && (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Generating</span>
        </div>
      )}
    </header>
  );
};
