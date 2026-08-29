import React, { useRef, useState, useEffect } from 'react';
import { GeneratedVariant, SourceVideo } from '../../types';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Terminal,
} from 'lucide-react';

interface VariantPreviewModalProps {
  variant: GeneratedVariant | null;
  sourceVideo: SourceVideo | null;
  onClose: () => void;
  onDownload: (variant: GeneratedVariant) => void;
}

export const VariantPreviewModal: React.FC<VariantPreviewModalProps> = ({
  variant,
  sourceVideo,
  onClose,
  onDownload,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [compareWithOriginal, setCompareWithOriginal] = useState(false);

  useEffect(() => {
    if (variant && videoRef.current) {
      videoRef.current.playbackRate = variant.adjustments.playbackSpeed || 1.0;
      videoRef.current.volume = Math.min(1, Math.max(0, (variant.adjustments.audioVolume || 100) / 100));
    }
  }, [variant]);

  if (!variant || !sourceVideo) return null;

  const adj = variant.adjustments;
  const brightness = 1 + adj.brightness / 100;
  const contrast = adj.contrast;
  const saturate = adj.saturation / 100;
  const hueRotate = (adj.colorTemperature || 0) * 0.8;

  const filterStyle = {
    filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`,
    transform: `rotate(${adj.rotation || 0}deg) scale(${(adj.zoomPercent || 100) / 100}) ${
      adj.horizontalFlip ? 'scaleX(-1)' : ''
    }`,
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(variant.ffmpegCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="variant-preview-modal-dialog"
        className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              Variant #{variant.variantNumber} Preview
            </h3>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">
              {variant.aspectRatio}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompareWithOriginal(!compareWithOriginal)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                compareWithOriginal
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {compareWithOriginal ? 'Show Variant' : 'Compare Original'}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Video Player Display */}
          <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center border border-zinc-800">
            <video
              ref={videoRef}
              src={sourceVideo.url}
              className="w-full h-full object-contain transition-all"
              style={compareWithOriginal ? undefined : filterStyle}
              loop
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Overlays */}
            {!compareWithOriginal && variant.optionalElements?.textOverlay?.enabled && (
              <div
                className={`absolute left-4 right-4 text-center font-bold text-sm pointer-events-none drop-shadow-md ${
                  variant.optionalElements.textOverlay.position === 'top'
                    ? 'top-4'
                    : variant.optionalElements.textOverlay.position === 'bottom'
                    ? 'bottom-8'
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

            {!compareWithOriginal && variant.optionalElements?.watermark?.enabled && (
              <div
                className="absolute bottom-3 right-4 font-mono text-xs text-white/80 pointer-events-none"
                style={{ opacity: variant.optionalElements.watermark.opacity / 100 }}
              >
                {variant.optionalElements.watermark.text}
              </div>
            )}

            {/* Bottom Player Controls */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-1.5 rounded bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Specs & Applied Settings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Resolution</span>
              <span className="font-mono text-zinc-200">{variant.resolution}</span>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Aspect Ratio</span>
              <span className="font-mono text-zinc-200">{variant.aspectRatio}</span>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Playback Speed</span>
              <span className="font-mono text-zinc-200">{adj.playbackSpeed}x</span>
            </div>
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Estimated Size</span>
              <span className="font-mono text-zinc-200">{variant.fileSize}</span>
            </div>
          </div>

          {/* FFmpeg Command */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> FFmpeg Command
              </span>
              <button
                onClick={copyCommand}
                className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              {variant.ffmpegCommand}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => onDownload(variant)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Video</span>
          </button>
        </div>
      </div>
    </div>
  );
};
