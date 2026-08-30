export type AspectRatioFormat = 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
export type QualityTier = 'original' | 'high' | 'medium' | 'compressed';
export type VariationMode = 'randomized' | 'manual';

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
  introOutro: IntroOutroConfig;
}

export interface MetadataTemplate {
  titlePattern: string;
  commentPattern: string;
  encoderPattern: string;
}

export interface VariantConfig {
  variantCount: number;
  mode: VariationMode;
  format: AspectRatioFormat;
  quality: QualityTier;
  adjustments: VideoAdjustments;
  optionalElements: OptionalElementsConfig;
  metadataTemplate: MetadataTemplate;
}

export interface VariantFileMetadata {
  uuid: string;
  title: string;
  comment: string;
  encoder: string;
  creationTime: string;
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
  outputBlob?: Blob;
  ffmpegCommand: string;
  metadata: VariantFileMetadata;
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
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  activeVariantIndex: number;
  variants: GeneratedVariant[];
  createdAt: string;
  completedAt?: string;
  totalRenderTimeMs?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}
