import React, { useRef, useState } from 'react';
import { SourceVideo } from '../../types';
import { SAMPLE_VIDEOS } from '../../data/sampleVideos';
import {
  UploadCloud,
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
} from 'lucide-react';

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    const videoUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = videoUrl;

    tempVideo.onloadedmetadata = () => {
      const width = tempVideo.videoWidth || 1920;
      const height = tempVideo.videoHeight || 1080;
      const duration = tempVideo.duration || 10;
      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      const formattedDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

      // Generate a canvas thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(width, 480);
      canvas.height = Math.min(height, 270);
      tempVideo.currentTime = Math.min(1.0, duration / 2);

      tempVideo.onseeked = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);

          const newVideo: SourceVideo = {
            id: `usr-${Date.now()}`,
            name: file.name,
            size: file.size,
            formattedSize: `${sizeMb} MB`,
            duration,
            formattedDuration,
            resolution: {
              width,
              height,
              label: `${width}x${height} (${width > height ? '16:9' : width < height ? '9:16' : '1:1'})`,
            },
            fps: 30,
            bitrate: `${((file.size * 8) / (duration * 1000000)).toFixed(1)} Mbps`,
            codec: file.type.includes('webm') ? 'WebM' : 'H.264',
            audioChannels: 'Stereo',
            url: videoUrl,
            thumbnailUrl: thumbUrl || SAMPLE_VIDEOS[0].thumbnailUrl,
            isSample: false,
          };
          onVideoSelected(newVideo);
        }
      };
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
    }
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
            Upload your video file or choose a sample to begin generating variants.
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

      {!sourceVideo ? (
        <div className="space-y-4">
          {/* Drag & Drop Card */}
          <div
            id="drag-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-zinc-400 bg-zinc-900/80'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <UploadCloud className="w-5 h-5" />
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-medium text-zinc-200">
                  Click to select or drag and drop video
                </p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  MP4, WebM, MOV
                </p>
              </div>
            </div>
          </div>

          {/* Sample Videos Grid */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-zinc-400">
              Or pick a sample video:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SAMPLE_VIDEOS.map((sample) => (
                <button
                  key={sample.id}
                  id={`sample-video-btn-${sample.id}`}
                  onClick={() => onVideoSelected(sample)}
                  className="group flex flex-col text-left p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="relative w-full aspect-video rounded overflow-hidden bg-black mb-2">
                    <img
                      src={sample.thumbnailUrl}
                      alt={sample.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 px-1 rounded bg-black/80 font-mono text-[9px] text-white">
                      {sample.formattedDuration}
                    </div>
                  </div>

                  <span className="text-xs font-medium text-zinc-300 truncate w-full">
                    {sample.name.replace(/\.[^/.]+$/, '')}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    {sample.formattedSize}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Video Selected Details Card */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
          {/* Player */}
          <div className="md:col-span-6 space-y-2">
            <div className="relative rounded overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
              <video
                ref={videoRef}
                src={sourceVideo.url}
                className="w-full h-full object-contain"
                loop
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
