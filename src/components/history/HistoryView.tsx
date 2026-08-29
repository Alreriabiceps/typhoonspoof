import React, { useState } from 'react';
import { GenerationJob } from '../../types';
import {
  History,
  CheckCircle2,
  Download,
  ExternalLink,
  Terminal,
  ChevronDown,
  ChevronUp,
  FileVideo,
  Layers,
  Calendar,
} from 'lucide-react';

interface HistoryViewProps {
  history: GenerationJob[];
  onOpenJobInStudio: (job: GenerationJob) => void;
  onDownloadAllVariants: (job: GenerationJob) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onOpenJobInStudio,
  onDownloadAllVariants,
}) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleLogs = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div id="history-view" className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Generation History</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Log of previously generated video batches and FFmpeg commands.
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-400">
          Total Jobs: <span className="font-semibold text-zinc-200">{history.length}</span>
        </div>
      </div>

      {/* History Jobs List */}
      {history.length === 0 ? (
        <div className="p-8 rounded-lg bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
          <History className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400">No generation history yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((job) => {
            const isExpanded = expandedLogId === job.id;

            return (
              <div
                key={job.id}
                id={`history-job-row-${job.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-colors"
              >
                {/* Main Row Information */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-11 rounded bg-black overflow-hidden flex-shrink-0 border border-zinc-800">
                      <img
                        src={job.sourceVideo.thumbnailUrl}
                        alt={job.projectName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-medium text-zinc-100 truncate">
                          {job.projectName}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">
                          {job.variantCount} Variants
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                        <span className="truncate max-w-[140px]">{job.sourceVideo.name}</span>
                        <span>•</span>
                        <span>{job.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => toggleLogs(job.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide FFmpeg' : 'FFmpeg'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      id={`history-download-all-${job.id}`}
                      onClick={() => onDownloadAllVariants(job)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      id={`history-open-project-${job.id}`}
                      onClick={() => onOpenJobInStudio(job)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible FFmpeg Execution Logs */}
                {isExpanded && (
                  <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 space-y-2">
                    <div className="text-[11px] font-mono text-zinc-400">
                      Generated Commands ({job.variants.length} tasks):
                    </div>

                    <div className="p-2.5 rounded bg-black border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1 max-h-40 overflow-y-auto leading-relaxed">
                      {job.variants.map((v, i) => (
                        <div key={i} className="text-zinc-400 whitespace-pre-wrap break-all">
                          <span className="text-zinc-500">#{v.variantNumber}:</span> {v.ffmpegCommand}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
