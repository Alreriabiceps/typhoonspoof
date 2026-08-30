import { SourceVideo, VariantConfig, GeneratedVariant } from '../types';
import {
  generateFFmpegCommand,
  generateRandomizedAdjustments,
  getResolutionForFormat,
} from './ffmpegGenerator';
import { estimateVariantSizeMb, formatClockDuration } from './format';
import { buildVariantMetadata } from './metadataSpoof';

export function buildInitialVariants(
  sourceVideo: SourceVideo,
  config: VariantConfig
): GeneratedVariant[] {
  const count = Math.max(1, Math.min(50, config.variantCount || 1));
  const isRandomized = config.mode === 'randomized';

  return Array.from({ length: count }, (_, i) => {
    const variantNumber = i + 1;
    let adjustments = { ...config.adjustments };
    const format = config.format;
    const quality = config.quality;

    if (isRandomized || count > 1) {
      adjustments = generateRandomizedAdjustments(adjustments, i);
    }

    const res = getResolutionForFormat(format, quality, sourceVideo.resolution);
    const durationSeconds = sourceVideo.duration / (adjustments.playbackSpeed || 1);
    const outName = `${sourceVideo.name.replace(/\.[^/.]+$/, '')}_var_${variantNumber
      .toString()
      .padStart(2, '0')}.mp4`;
    const metadata = buildVariantMetadata(variantNumber, config.metadataTemplate);

    return {
      id: `var-${Date.now()}-${variantNumber}`,
      variantNumber,
      title: `Variant #${variantNumber} (${format})`,
      resolution: res.label,
      aspectRatio: format,
      duration: formatClockDuration(durationSeconds),
      fileSize: estimateVariantSizeMb(sourceVideo.size, quality, adjustments.playbackSpeed || 1),
      format: 'MP4 (H.264)',
      quality,
      adjustments,
      optionalElements: config.optionalElements,
      status: i === 0 ? 'processing' : 'queued',
      progress: i === 0 ? 10 : 0,
      currentStage: i === 0 ? 'Processing video' : 'Queued',
      thumbnail: sourceVideo.thumbnailUrl,
      videoUrl: sourceVideo.url,
      ffmpegCommand: generateFFmpegCommand(
        sourceVideo.name,
        outName,
        adjustments,
        format,
        quality,
        config.optionalElements,
        metadata,
        { source: sourceVideo.resolution }
      ),
      metadata,
    };
  });
}

export function advanceGenerationTick(
  variants: GeneratedVariant[],
  currentIdx: number,
  variantProg: number
): {
  variants: GeneratedVariant[];
  currentIdx: number;
  variantProg: number;
  overallProgress: number;
  done: boolean;
} {
  const stages = [
    'Cropping & Scaling',
    'Adjusting Color',
    'Applying Rotation',
    'Encoding MP4',
  ];

  const next = variants.map((v) => ({ ...v }));
  let idx = currentIdx;
  let prog = variantProg + 25;

  if (prog < 100) {
    const stageIndex = Math.min(stages.length - 1, Math.floor(prog / 20));
    if (next[idx]) {
      next[idx] = {
        ...next[idx],
        status: 'processing',
        progress: prog,
        currentStage: stages[stageIndex],
      };
    }
  } else {
    if (next[idx]) {
      next[idx] = {
        ...next[idx],
        status: 'completed',
        progress: 100,
        currentStage: 'Completed',
      };
    }
    idx += 1;
    prog = 0;
    if (idx < next.length) {
      next[idx] = {
        ...next[idx],
        status: 'processing',
        progress: 15,
        currentStage: stages[0],
      };
    }
  }

  const done = idx >= next.length;
  const overallProgress = done
    ? 100
    : Math.min(100, Math.round(((idx * 100 + prog) / (next.length * 100)) * 100));

  return {
    variants: next,
    currentIdx: idx,
    variantProg: prog,
    overallProgress,
    done,
  };
}
