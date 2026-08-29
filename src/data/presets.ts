import { PresetCategory, VariantConfig, VideoAdjustments, OptionalElementsConfig } from '../types';

export interface PresetDefinition {
  id: PresetCategory;
  name: string;
  badge: string;
  description: string;
  iconName: string;
  config: Partial<VariantConfig>;
}

export const DEFAULT_ADJUSTMENTS: VideoAdjustments = {
  cropReframe: 'center',
  zoomPercent: 100,
  rotation: 0,
  brightness: 0,
  contrast: 1.0,
  saturation: 100,
  colorTemperature: 0,
  playbackSpeed: 1.0,
  audioVolume: 100,
  pitchCorrection: true,
  horizontalFlip: false,
};

export const DEFAULT_OPTIONAL_ELEMENTS: OptionalElementsConfig = {
  textOverlay: {
    enabled: false,
    text: 'MUST WATCH 🔥',
    position: 'bottom',
    style: 'bold-yellow',
    fontSize: 32,
  },
  watermark: {
    enabled: false,
    text: '@videocreator',
    opacity: 60,
    position: 'bottom-right',
  },
  introOutro: {
    introEnabled: false,
    introTitle: 'New Release',
    introDuration: 1.5,
    introStyle: 'fade-black',
    outroEnabled: false,
    outroCta: 'Subscribe & Follow',
    outroDuration: 2.0,
    outroStyle: 'blur-card',
  },
};

export const PRESETS: PresetDefinition[] = [
  {
    id: 'social-media',
    name: 'Social Media Multi-Format',
    badge: 'Popular',
    description: 'Dynamic mix of 9:16 vertical, 1:1 square, and 4:5 portrait with punchy contrast and optimized audio for TikTok, Reels, and Shorts.',
    iconName: 'Share2',
    config: {
      format: '9:16',
      quality: 'high',
      variantCount: 10,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        contrast: 1.15,
        saturation: 115,
        brightness: 4,
      },
    },
  },
  {
    id: 'vertical-short',
    name: 'Vertical Short / Reels',
    badge: '9:16 Focus',
    description: 'Tailored 9:16 crop with center subject tracking, slight zoom (+8%), boosted vibrance, and subtitle-ready headroom.',
    iconName: 'Smartphone',
    config: {
      format: '9:16',
      quality: 'high',
      variantCount: 5,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        cropReframe: 'center',
        zoomPercent: 108,
        contrast: 1.1,
        saturation: 120,
        brightness: 6,
      },
      optionalElements: {
        ...DEFAULT_OPTIONAL_ELEMENTS,
        textOverlay: {
          enabled: true,
          text: 'Wait for the end 👀',
          position: 'top',
          style: 'bold-yellow',
          fontSize: 34,
        },
      },
    },
  },
  {
    id: 'square-post',
    name: 'Square Feed Post',
    badge: '1:1 Feed',
    description: 'Clean 1:1 square aspect ratio designed for Instagram Feed and LinkedIn cards with branded watermark capability.',
    iconName: 'Square',
    config: {
      format: '1:1',
      quality: 'high',
      variantCount: 5,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        cropReframe: 'center',
        contrast: 1.05,
        saturation: 105,
      },
    },
  },
  {
    id: 'high-quality',
    name: 'High Quality Master',
    badge: 'ProRes / 4K',
    description: 'Crisp 1080p/4K master outputs with CRF 18 encoding, natural color reproduction, and pristine 192kbps stereo audio.',
    iconName: 'Sparkles',
    config: {
      format: '16:9',
      quality: 'high',
      variantCount: 5,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        contrast: 1.0,
        saturation: 100,
        brightness: 0,
      },
    },
  },
  {
    id: 'lightweight',
    name: 'Lightweight Web & Ads',
    badge: 'Fast & Small',
    description: 'Optimized compression (CRF 28) for ultra-fast CDN delivery, ad networks, email attachments, and rapid mobile previewing.',
    iconName: 'Zap',
    config: {
      format: 'original',
      quality: 'compressed',
      variantCount: 10,
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        playbackSpeed: 1.0,
      },
    },
  },
];
