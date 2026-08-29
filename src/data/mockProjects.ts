import { Project, GenerationJob, GeneratedVariant } from '../types';
import { SAMPLE_VIDEOS } from './sampleVideos';
import { DEFAULT_ADJUSTMENTS, DEFAULT_OPTIONAL_ELEMENTS } from './presets';
import { generateFFmpegCommand } from '../utils/ffmpegGenerator';

function makeMockVariants(sourceVideo = SAMPLE_VIDEOS[0], count = 5): GeneratedVariant[] {
  const formats: any[] = ['16:9', '9:16', '1:1', '4:5', '16:9'];
  const qualities: any[] = ['high', 'high', 'medium', 'compressed', 'high'];

  return Array.from({ length: count }, (_, i) => {
    const format = formats[i % formats.length];
    const quality = qualities[i % qualities.length];
    const variantNumber = i + 1;
    const speed = 1.0 + (i === 2 ? 0.1 : i === 4 ? -0.05 : 0);
    const bright = i === 1 ? 5 : i === 3 ? -3 : 2;
    const adjustments = {
      ...DEFAULT_ADJUSTMENTS,
      playbackSpeed: speed,
      brightness: bright,
      contrast: 1.05 + (i * 0.03),
      saturation: 100 + (i * 5),
    };

    const resLabel = format === '9:16' ? '1080x1920' : format === '1:1' ? '1080x1080' : format === '4:5' ? '1080x1350' : '1920x1080';
    const durSec = Math.round(sourceVideo.duration / speed);
    const durLabel = `00:${durSec < 10 ? '0' + durSec : durSec}`;
    const sizeMb = ((sourceVideo.size / 1024 / 1024) * (quality === 'compressed' ? 0.35 : quality === 'medium' ? 0.65 : 0.9) / speed).toFixed(1);

    const outName = `${sourceVideo.name.replace('.mp4', '')}_var_${variantNumber.toString().padStart(2, '0')}.mp4`;
    const ffmpegCmd = generateFFmpegCommand(sourceVideo.name, outName, adjustments, format, quality, DEFAULT_OPTIONAL_ELEMENTS);

    return {
      id: `var-${i + 1}-${Date.now()}`,
      variantNumber,
      title: `Variant #${variantNumber} (${format} • ${quality})`,
      resolution: resLabel,
      aspectRatio: format,
      duration: durLabel,
      fileSize: `${sizeMb} MB`,
      format: 'MP4 (H.264)',
      quality,
      adjustments,
      optionalElements: DEFAULT_OPTIONAL_ELEMENTS,
      status: 'completed',
      progress: 100,
      currentStage: 'Encoding finished',
      thumbnail: sourceVideo.thumbnailUrl,
      videoUrl: sourceVideo.url,
      ffmpegCommand: ffmpegCmd,
      renderTimeMs: 1420 + (i * 310),
    };
  });
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-01',
    name: 'Summer Campaign Reel 2026',
    description: 'Multi-platform advertising cutdowns for TikTok, IG Reels, and YouTube Shorts.',
    sourceVideo: SAMPLE_VIDEOS[0],
    variantCount: 10,
    createdAt: '2026-08-28 14:32',
    lastModified: '2026-08-28 14:38',
    status: 'completed',
    variants: makeMockVariants(SAMPLE_VIDEOS[0], 10),
    config: {
      variantCount: 10,
      mode: 'preset',
      preset: 'social-media',
      format: '9:16',
      quality: 'high',
      adjustments: DEFAULT_ADJUSTMENTS,
      optionalElements: DEFAULT_OPTIONAL_ELEMENTS,
    },
  },
  {
    id: 'proj-02',
    name: 'Product Launch Showcase Alpha',
    description: '1:1 Square product showcases and 16:9 master formats with enhanced color contrast.',
    sourceVideo: SAMPLE_VIDEOS[1],
    variantCount: 5,
    createdAt: '2026-08-27 10:15',
    lastModified: '2026-08-27 10:20',
    status: 'completed',
    variants: makeMockVariants(SAMPLE_VIDEOS[1], 5),
    config: {
      variantCount: 5,
      mode: 'randomized',
      preset: 'square-post',
      format: '1:1',
      quality: 'high',
      adjustments: DEFAULT_ADJUSTMENTS,
      optionalElements: DEFAULT_OPTIONAL_ELEMENTS,
    },
  },
  {
    id: 'proj-03',
    name: 'Fitness Workout Vertical Series',
    description: 'Speed-ramped variations for TikTok and Instagram stories.',
    sourceVideo: SAMPLE_VIDEOS[3],
    variantCount: 6,
    createdAt: '2026-08-26 19:40',
    lastModified: '2026-08-26 19:46',
    status: 'completed',
    variants: makeMockVariants(SAMPLE_VIDEOS[3], 6),
    config: {
      variantCount: 6,
      mode: 'preset',
      preset: 'vertical-short',
      format: '9:16',
      quality: 'high',
      adjustments: DEFAULT_ADJUSTMENTS,
      optionalElements: DEFAULT_OPTIONAL_ELEMENTS,
    },
  }
];

export const INITIAL_HISTORY: GenerationJob[] = [
  {
    id: 'job-hist-1',
    projectId: 'proj-01',
    projectName: 'Summer Campaign Reel 2026',
    sourceVideo: SAMPLE_VIDEOS[0],
    variantCount: 10,
    mode: 'preset',
    presetName: 'Social Media Multi-Format',
    status: 'completed',
    progress: 100,
    activeVariantIndex: 10,
    variants: makeMockVariants(SAMPLE_VIDEOS[0], 10),
    createdAt: '2026-08-28 14:32',
    completedAt: '2026-08-28 14:38',
    totalRenderTimeMs: 18450,
  },
  {
    id: 'job-hist-2',
    projectId: 'proj-02',
    projectName: 'Product Launch Showcase Alpha',
    sourceVideo: SAMPLE_VIDEOS[1],
    variantCount: 5,
    mode: 'randomized',
    presetName: 'Controlled Randomization',
    status: 'completed',
    progress: 100,
    activeVariantIndex: 5,
    variants: makeMockVariants(SAMPLE_VIDEOS[1], 5),
    createdAt: '2026-08-27 10:15',
    completedAt: '2026-08-27 10:20',
    totalRenderTimeMs: 9120,
  },
  {
    id: 'job-hist-3',
    projectId: 'proj-03',
    projectName: 'Fitness Workout Vertical Series',
    sourceVideo: SAMPLE_VIDEOS[3],
    variantCount: 6,
    mode: 'preset',
    presetName: 'Vertical Short / Reels',
    status: 'completed',
    progress: 100,
    activeVariantIndex: 6,
    variants: makeMockVariants(SAMPLE_VIDEOS[3], 6),
    createdAt: '2026-08-26 19:40',
    completedAt: '2026-08-26 19:46',
    totalRenderTimeMs: 11400,
  }
];
