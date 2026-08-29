export type NavPage = 'dashboard' | 'generator' | 'projects' | 'history' | 'settings';

export type AspectRatioFormat = 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
export type QualityTier = 'original' | 'high' | 'medium' | 'compressed';
export type VariationMode = 'manual' | 'randomized' | 'preset';
export type PresetCategory = 'social-media' | 'vertical-short' | 'square-post' | 'high-quality' | 'lightweight';

export interface SourceVideo {
  id: string;
  name: string;
  size: number; // in bytes
  formattedSize: string;
  duration: number; // in seconds
  formattedDuration: string;
  resolution: {
    width: number;
    height: number;
    label: string;
  };
  fps: number;
  bitrate: string;
  codec: string;
  audioChannels: string;
  url: string;
  thumbnailUrl: string;
  isSample?: boolean;
}

export interface VideoAdjustments {
  cropReframe: 'original' | 'center' | 'smart-pan' | 'zoom-in' | 'top-crop';
  zoomPercent: number; // 100 - 150
  rotation: number; // -10 to +10 degrees
  brightness: number; // -50 to +50 %
  contrast: number; // 0.5 to 2.0
  saturation: number; // 0 to 200 %
  colorTemperature: number; // -50 (Cool) to +50 (Warm)
  playbackSpeed: number; // 0.5 to 2.0
  audioVolume: number; // 0 to 200 %
  pitchCorrection: boolean;
  horizontalFlip: boolean;
  // Randomized ranges for randomized mode
  rotationRange?: [number, number];
  brightnessRange?: [number, number];
  contrastRange?: [number, number];
  speedRange?: [number, number];
}

export interface TextOverlayConfig {
  enabled: boolean;
  text: string;
  position: 'top' | 'center' | 'bottom';
  style: 'bold-yellow' | 'clean-white' | 'boxed-black' | 'neon-glow';
  fontSize: number;
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  opacity: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface IntroOutroConfig {
  introEnabled: boolean;
  introTitle: string;
  introDuration: number;
  introStyle: 'fade-black' | 'flash' | 'zoom';
  outroEnabled: boolean;
  outroCta: string;
  outroDuration: number;
  outroStyle: 'fade-black' | 'blur-card';
}

export interface OptionalElementsConfig {
  textOverlay: TextOverlayConfig;
  watermark: WatermarkConfig;
  introOutro: IntroOutroConfig;
}

export interface VariantConfig {
  variantCount: number;
  mode: VariationMode;
  preset: PresetCategory;
  format: AspectRatioFormat;
  quality: QualityTier;
  adjustments: VideoAdjustments;
  optionalElements: OptionalElementsConfig;
}

export interface GeneratedVariant {
  id: string;
  variantNumber: number;
  title: string;
  resolution: string;
  aspectRatio: AspectRatioFormat;
  duration: string;
  fileSize: string;
  format: string;
  quality: QualityTier;
  adjustments: VideoAdjustments;
  optionalElements: OptionalElementsConfig;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStage?: string;
  thumbnail: string;
  videoUrl: string;
  ffmpegCommand: string;
  error?: string;
  renderTimeMs?: number;
}

export interface GenerationJob {
  id: string;
  projectId: string;
  projectName: string;
  sourceVideo: SourceVideo;
  variantCount: number;
  mode: VariationMode;
  presetName?: string;
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  activeVariantIndex: number;
  variants: GeneratedVariant[];
  createdAt: string;
  completedAt?: string;
  totalRenderTimeMs?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  sourceVideo: SourceVideo;
  variantCount: number;
  createdAt: string;
  lastModified: string;
  status: 'completed' | 'draft' | 'archived';
  variants: GeneratedVariant[];
  config: VariantConfig;
}

export interface AppSettings {
  defaultFormat: AspectRatioFormat;
  defaultQuality: QualityTier;
  defaultVariantCount: number;
  outputFolder: string;
  backendApiUrl: string;
  backendConnected: boolean;
  hardwareAcceleration: 'auto' | 'nvenc' | 'qsv' | 'vaapi' | 'cpu';
  exportNamingPattern: string;
  autoZipOnComplete: boolean;
  concurrentThreads: number;
  soundNotifications: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}
