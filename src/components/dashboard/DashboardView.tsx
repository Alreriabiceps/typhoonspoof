import React from 'react';
import { Project, GenerationJob } from '../../types';
import {
  Film,
  Layers,
  FolderKanban,
  History,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface DashboardViewProps {
  projects: Project[];
  history: GenerationJob[];
  onStartNewJob: () => void;
  onOpenProject: (project: Project) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  history,
  onStartNewJob,
  onOpenProject,
}) => {
  const totalVariantsGenerated = history.reduce((acc, job) => acc + job.variantCount, 0);
  const totalCompletedJobs = history.filter((h) => h.status === 'completed').length;

  return (
    <div id="dashboard-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Overview</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create and manage video variations across aspect ratios and filter styles.
          </p>
        </div>

        <button
          id="dashboard-start-generator-btn"
          onClick={onStartNewJob}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Generation</span>
        </button>
      </div>

      {/* Real Stats Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Variants Created</span>
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold font-mono text-zinc-100">{totalVariantsGenerated}</div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Completed Batches</span>
            <History className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold font-mono text-zinc-100">{totalCompletedJobs}</div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Saved Projects</span>
            <FolderKanban className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-semibold font-mono text-zinc-100">{projects.length}</div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Recent Projects
          </h3>
          <span className="text-xs text-zinc-500">{projects.length} total</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 rounded-lg bg-zinc-900/50 border border-zinc-800 text-center space-y-3">
            <Film className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No projects yet. Start by generating variants from a video.</p>
            <button
              onClick={onStartNewJob}
              className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
            >
              Start Generator
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((proj) => (
              <div
                key={proj.id}
                id={`dashboard-project-row-${proj.id}`}
                onClick={() => onOpenProject(proj)}
                className="group p-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-10 rounded bg-zinc-950 overflow-hidden flex-shrink-0 border border-zinc-800">
                    <img
                      src={proj.sourceVideo.thumbnailUrl}
                      alt={proj.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                      {proj.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 font-mono">
                      <span>{proj.sourceVideo.name}</span>
                      <span>•</span>
                      <span>{proj.variantCount} variants</span>
                      <span>•</span>
                      <span>{proj.lastModified}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded text-zinc-400 group-hover:text-zinc-200">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
