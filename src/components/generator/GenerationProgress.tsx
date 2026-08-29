import React from 'react';
import { GenerationJob } from '../../types';
import { Play, Pause, XCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface GenerationProgressProps {
  job: GenerationJob;
  onPauseResume: () => void;
  onCancel: () => void;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  job,
  onPauseResume,
  onCancel,
}) => {
  const completedCount = job.variants.filter((v) => v.status === 'completed').length;
  const isPaused = job.status === 'paused';

  return (
    <div id="generation-progress-view" className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Main Progress Header */}
      <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              <span>Generating Variants ({completedCount}/{job.variantCount})</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Processing &apos;{job.sourceVideo.name}&apos; into {job.variantCount} variations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPauseResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/40 hover:bg-red-900/50 text-red-400 text-xs font-medium border border-red-800/40 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-zinc-400">Total Progress</span>
            <span className="text-zinc-200 font-semibold">{job.progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-zinc-100 transition-all duration-300 rounded-full"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Variants Progress */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-zinc-400">Variants Queue:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {job.variants.map((v) => {
            const isDone = v.status === 'completed';
            const isProcessing = v.status === 'processing';

            return (
              <div
                key={v.id}
                className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 transition-colors ${
                  isDone
                    ? 'bg-zinc-900 border-zinc-700'
                    : isProcessing
                    ? 'bg-zinc-900/80 border-zinc-500'
                    : 'bg-zinc-950/60 border-zinc-800/80 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-200">
                    Variant #{v.variantNumber}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {v.aspectRatio}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>{isDone ? 'Completed' : isProcessing ? 'Rendering' : 'Queued'}</span>
                    <span className="font-mono">{v.progress}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isDone ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                      style={{ width: `${v.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
