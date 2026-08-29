import React, { useState } from 'react';
import { GeneratedVariant, AspectRatioFormat } from '../../types';
import {
  Download,
  Eye,
  Archive,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Film,
} from 'lucide-react';

interface ResultsGridProps {
  variants: GeneratedVariant[];
  onPreviewVariant: (variant: GeneratedVariant) => void;
  onDownloadVariant: (variant: GeneratedVariant) => void;
  onDownloadAll: () => void;
  onExportZip: () => void;
  onNewGeneration: () => void;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  variants,
  onPreviewVariant,
  onDownloadVariant,
  onDownloadAll,
  onExportZip,
  onNewGeneration,
}) => {
  const [formatFilter, setFormatFilter] = useState<string>('all');

  const filteredVariants = variants.filter((v) => {
    if (formatFilter === 'all') return true;
    return v.aspectRatio === formatFilter;
  });

  const availableFormats = Array.from(new Set(variants.map((v) => v.aspectRatio)));

  // Helper to compute CSS filter style matching the variant adjustments
  const getPreviewFilterStyle = (v: GeneratedVariant) => {
    const adj = v.adjustments;
    const brightness = 1 + adj.brightness / 100;
    const contrast = adj.contrast;
    const saturate = adj.saturation / 100;
    const hueRotate = (adj.colorTemperature || 0) * 0.8;
    return {
      filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`,
      transform: `rotate(${adj.rotation || 0}deg) scale(${(adj.zoomPercent || 100) / 100}) ${
        adj.horizontalFlip ? 'scaleX(-1)' : ''
      }`,
    };
  };

  return (
    <div id="results-grid-view" className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Generation Complete ({variants.length} Variants)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Click any variant card to preview in full screen or download individually.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="results-new-generation-btn"
            onClick={onNewGeneration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Generation</span>
          </button>

          <button
            id="results-export-zip-btn"
            onClick={onExportZip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Export ZIP</span>
          </button>

          <button
            id="results-download-all-btn"
            onClick={onDownloadAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs if multiple formats */}
      {availableFormats.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 mr-1">Filter:</span>
          <button
            onClick={() => setFormatFilter('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              formatFilter === 'all'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({variants.length})
          </button>
          {availableFormats.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                formatFilter === fmt
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {fmt} ({variants.filter((v) => v.aspectRatio === fmt).length})
            </button>
          ))}
        </div>
      )}

      {/* Variants Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredVariants.map((variant) => {
          const adj = variant.adjustments;

          return (
            <div
              key={variant.id}
              id={`variant-card-${variant.id}`}
              className="group rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 overflow-hidden flex flex-col justify-between transition-colors"
            >
              <div>
                {/* Visual Preview Frame */}
                <div
                  className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer"
                  onClick={() => onPreviewVariant(variant)}
                >
                  <img
                    src={variant.thumbnail}
                    alt={variant.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform"
                    style={getPreviewFilterStyle(variant)}
                  />

                  {/* Overlays preview */}
                  {variant.optionalElements?.textOverlay?.enabled && (
                    <div
                      className={`absolute left-2 right-2 text-center text-[10px] font-bold pointer-events-none drop-shadow ${
                        variant.optionalElements.textOverlay.position === 'top'
                          ? 'top-2'
                          : variant.optionalElements.textOverlay.position === 'bottom'
                          ? 'bottom-2'
                          : 'top-1/2 -translate-y-1/2'
                      } ${
                        variant.optionalElements.textOverlay.style === 'bold-yellow'
                          ? 'text-yellow-300'
                          : 'text-white'
                      }`}
                    >
                      {variant.optionalElements.textOverlay.text}
                    </div>
                  )}

                  {variant.optionalElements?.watermark?.enabled && (
                    <div
                      className="absolute bottom-1 right-2 text-[9px] font-mono text-white/70 pointer-events-none"
                      style={{ opacity: variant.optionalElements.watermark.opacity / 100 }}
                    >
                      {variant.optionalElements.watermark.text}
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewVariant(variant);
                      }}
                      className="p-2 rounded-full bg-zinc-900/90 text-white hover:bg-black"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] font-medium text-zinc-200">
                      #{variant.variantNumber}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800/90 font-mono text-[10px] text-zinc-300">
                      {variant.aspectRatio}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-200 truncate">
                      Variant #{variant.variantNumber}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {variant.fileSize}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-500 font-mono space-y-0.5">
                    <div>Res: {variant.resolution}</div>
                    <div className="truncate">
                      Spd: {adj.playbackSpeed}x | Br: {adj.brightness > 0 ? `+${adj.brightness}` : adj.brightness}% | Sat: {adj.saturation}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between gap-2">
                <button
                  id={`preview-variant-btn-${variant.id}`}
                  onClick={() => onPreviewVariant(variant)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <button
                  id={`download-variant-btn-${variant.id}`}
                  onClick={() => onDownloadVariant(variant)}
                  className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                  title="Download MP4"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
