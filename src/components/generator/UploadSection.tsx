import React, { useRef, useState } from 'react';
import { SourceVideo } from '../../types';
import { formatClockDuration } from '../../utils/format';
import {
  UploadCloud,
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';

const FALLBACK_THUMBNAIL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect fill="#18181b" width="100%" height="100%"/></svg>'
  );

interface UploadSectionProps {
  sourceVideo: SourceVideo | null;
  onVideoSelected: (video: SourceVideo) => void;
  onClearVideo: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  sourceVideo,
  onVideoSelected,
  onClearVideo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    const looksLikeVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    if (!looksLikeVideo) {
      setReadError('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    setReadError(null);
    setIsReadingFile(true);

    const videoUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.src = videoUrl;

    let emitted = false;
    const fail = (message: string) => {
      if (emitted) return;
      emitted = true;
      setIsReadingFile(false);
      URL.revokeObjectURL(videoUrl);
      setReadError(message);
    };

    const emitVideo = (thumbUrl: string) => {
      if (emitted) return;
      emitted = true;
      setIsReadingFile(false);

      const width = tempVideo.videoWidth || 0;
      const height = tempVideo.videoHeight || 0;
      if (!width || !height) {
        URL.revokeObjectURL(videoUrl);
        setReadError('Could not read video dimensions. Try another MP4, WebM, or MOV.');
        return;
      }

      const duration = Number.isFinite(tempVideo.duration) ? tempVideo.duration : 0;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const bitrate = duration > 0 ? `${((file.size * 8) / (duration * 1000000)).toFixed(1)} Mbps` : '—';

      const newVideo: SourceVideo = {
        id: `usr-${Date.now()}`,
        name: file.name,
        size: file.size,
        formattedSize: `${sizeMb} MB`,
        duration,
        formattedDuration: formatClockDuration(duration),
        resolution: {
          width,
          height,
          label: `${width}x${height} (${width > height ? '16:9' : width < height ? '9:16' : '1:1'})`,
        },
        fps: 30,
        bitrate,
        codec: file.type.includes('webm') ? 'WebM' : 'H.264',
        audioChannels: 'Stereo',
        url: videoUrl,
        thumbnailUrl: thumbUrl || FALLBACK_THUMBNAIL,
      };
      onVideoSelected(newVideo);
    };

    const captureThumbnail = () => {
      try {
        const width = tempVideo.videoWidth || 480;
        const height = tempVideo.videoHeight || 270;
        const maxEdge = 480;
        const scale = Math.min(maxEdge / width, maxEdge / height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx && width > 0 && height > 0) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          emitVideo(canvas.toDataURL('image/jpeg', 0.8));
          return;
        }
      } catch {
        // Fall through to placeholder thumbnail
      }
      emitVideo(FALLBACK_THUMBNAIL);
    };

    tempVideo.onloadedmetadata = () => {
      const duration = Number.isFinite(tempVideo.duration) ? tempVideo.duration : 0;
      const seekTarget = duration > 0 ? Math.min(1, duration / 2) : 0;
      window.setTimeout(() => {
        if (!emitted) emitVideo(FALLBACK_THUMBNAIL);
      }, 2000);
      if (seekTarget === 0 || Math.abs(tempVideo.currentTime - seekTarget) < 0.05) {
        captureThumbnail();
        return;
      }
      tempVideo.onseeked = captureThumbnail;
      try {
        tempVideo.currentTime = seekTarget;
      } catch {
        captureThumbnail();
      }
    };

    tempVideo.onerror = () => {
      fail('Could not read this video file. Try MP4, WebM, or MOV.');
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        void videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section id="upload-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Film className="w-4 h-4 text-zinc-400" />
            <span>Source Video</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Upload a video file to begin generating variants.
          </p>
        </div>

        {sourceVideo && (
          <button
            id="clear-video-btn"
            onClick={onClearVideo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Change Video</span>
          </button>
        )}
      </div>

      <input
        id="source-video-input"
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {!sourceVideo ? (
        <div className="space-y-2">
          <div
            id="drag-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isReadingFile && fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-zinc-400 bg-zinc-900/80'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <UploadCloud className="w-5 h-5" />
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-medium text-zinc-200">
                  {isReadingFile ? 'Reading video…' : 'Click to select or drag and drop video'}
                </p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  MP4, WebM, MOV
                </p>
              </div>
            </div>
          </div>
          {readError && (
            <p className="text-xs text-red-400" id="upload-error">
              {readError}
            </p>
          )}
        </div>
      ) : (
        /* Video Selected Details Card */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          {/* Player */}
          <div className="md:col-span-6 space-y-2">
            <div className="relative rounded overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
              <video
                ref={videoRef}
                key={sourceVideo.url}
                src={sourceVideo.url}
                className="w-full h-full object-contain"
                loop
                playsInline
                preload="auto"
                muted={isMuted}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Video Metadata */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200 truncate">
                {sourceVideo.name}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {sourceVideo.codec} • {sourceVideo.formattedSize}
              </p>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Duration</span>
                  <span className="font-mono text-zinc-200">{sourceVideo.formattedDuration}</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Resolution</span>
                  <span className="font-mono text-zinc-200">{sourceVideo.resolution.width}x{sourceVideo.resolution.height}</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Frame Rate</span>
                  <span className="font-mono text-zinc-200">{sourceVideo.fps} fps</span>
                </div>
                <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Bitrate</span>
                  <span className="font-mono text-zinc-200">{sourceVideo.bitrate}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
              >
                Upload different file
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
