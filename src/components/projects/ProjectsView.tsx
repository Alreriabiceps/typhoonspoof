import React, { useState } from 'react';
import { Project } from '../../types';
import {
  FolderKanban,
  Search,
  Plus,
  Download,
  Trash2,
  Calendar,
  FileVideo,
  ExternalLink,
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onStartNewProject: () => void;
  onDownloadProjectVariants: (project: Project) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onOpenProject,
  onDeleteProject,
  onStartNewProject,
  onDownloadProjectVariants,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sourceVideo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="projects-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Projects</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            View and manage your video generation batches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 w-56"
            />
          </div>

          <button
            id="projects-create-new-btn"
            onClick={onStartNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-8 rounded-lg bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
          <FolderKanban className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400">
            {searchQuery ? 'No matching projects found.' : 'No projects created yet.'}
          </p>
          <button
            onClick={onStartNewProject}
            className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 text-xs font-medium"
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              id={`project-card-${project.id}`}
              className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg overflow-hidden flex flex-col justify-between transition-colors"
            >
              <div>
                {/* Thumbnail Banner */}
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img
                    src={project.sourceVideo.thumbnailUrl}
                    alt={project.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-black/80 text-zinc-300 font-mono text-[10px]">
                      {project.variantCount} Variants
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-medium text-zinc-100 truncate">
                    {project.name}
                  </h3>

                  <div className="space-y-1 text-[11px] text-zinc-400 font-mono">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileVideo className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span className="truncate">{project.sourceVideo.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{project.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2.5 bg-zinc-950/40 border-t border-zinc-800 flex items-center justify-between gap-2">
                <button
                  id={`open-project-btn-${project.id}`}
                  onClick={() => onOpenProject(project)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </button>

                <button
                  id={`download-project-btn-${project.id}`}
                  onClick={() => onDownloadProjectVariants(project)}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                  title="Download All"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  id={`delete-project-btn-${project.id}`}
                  onClick={() => onDeleteProject(project.id)}
                  className="p-1.5 rounded bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/30 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
