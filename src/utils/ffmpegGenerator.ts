import { AspectRatioFormat, QualityTier, VideoAdjustments, OptionalElementsConfig, VariantFileMetadata } from '../types';
import { metadataFfmpegArgList } from './metadataSpoof';

export interface FFmpegGenerateOptions {
  preset?: 'ultrafast' | 'veryfast' | 'medium';
  includeDrawtext?: boolean;
  source?: { width: number; height: number };
  wasmSafe?: boolean;
}

export function getResolutionForFormat(
  format: AspectRatioFormat,
  quality: QualityTier,
  source?: { width: number; height: number }
): { width: number; height: number; label: string } {
  let baseDimension = 1080;
  if (quality === 'medium') baseDimension = 720;
  else if (quality === 'compressed') baseDimension = 540;

  switch (format) {
    case '16:9':
      return { width: Math.round(baseDimension * (16 / 9)), height: baseDimension, label: `${Math.round(baseDimension * (16 / 9))}x${baseDimension}` };
    case '9:16':
      return { width: baseDimension, height: Math.round(baseDimension * (16 / 9)), label: `${baseDimension}x${Math.round(baseDimension * (16 / 9))}` };
    case '1:1':
      return { width: baseDimension, height: baseDimension, label: `${baseDimension}x${baseDimension}` };
    case '4:5':
      return { width: baseDimension, height: Math.round(baseDimension * 1.25), label: `${baseDimension}x${Math.round(baseDimension * 1.25)}` };
    case '21:9':
      return { width: Math.round(baseDimension * (21 / 9)), height: baseDimension, label: `${Math.round(baseDimension * (21 / 9))}x${baseDimension}` };
    case 'original':
    default: {
      const width = source?.width || 1920;
      const height = source?.height || 1080;
      return { width, height, label: `${width}x${height} (Source)` };
    }
  }
}

export function buildFilterChains(
  adjustments: VideoAdjustments,
  format: AspectRatioFormat,
  quality: QualityTier,
  optional?: OptionalElementsConfig,
  options?: FFmpegGenerateOptions
): { vfilters: string[]; afilters: string[] } {
  const vfilters: string[] = [];
  const afilters: string[] = [];
  const res = getResolutionForFormat(format, quality, options?.source);

  const srcW = options?.source?.width || 0;
  const srcH = options?.source?.height || 0;
  if (format === '9:16') {
    if (srcW && srcH && srcW * 16 > srcH * 9) {
      vfilters.push('crop=ih*9/16:ih');
    }
  } else if (format === '1:1') {
    if (srcW && srcH && srcW !== srcH) {
      vfilters.push(srcW > srcH ? 'crop=ih:ih' : 'crop=iw:iw');
    }
  } else if (format === '4:5') {
    if (srcW && srcH && srcW * 5 > srcH * 4) {
      vfilters.push('crop=ih*4/5:ih');
    }
  }

  if (adjustments.zoomPercent && adjustments.zoomPercent > 100) {
    const factor = (adjustments.zoomPercent / 100).toFixed(2);
    vfilters.push(`scale=iw*${factor}:ih*${factor},crop=iw/${factor}:ih/${factor}`);
  }

  vfilters.push(
    `scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2`
  );

  if (adjustments.rotation && adjustments.rotation !== 0) {
    const rad = (adjustments.rotation * (Math.PI / 180)).toFixed(4);
    vfilters.push(`rotate=${rad}:ow=rotw(${rad}):oh=roth(${rad})`);
  }

  const brightnessVal = (adjustments.brightness / 100).toFixed(2);
  const contrastVal = adjustments.contrast.toFixed(2);
  const saturationVal = (adjustments.saturation / 100).toFixed(2);

  if (adjustments.brightness !== 0 || adjustments.contrast !== 1.0 || adjustments.saturation !== 100) {
    vfilters.push(`eq=brightness=${brightnessVal}:contrast=${contrastVal}:saturation=${saturationVal}`);
  }

  if (adjustments.colorTemperature !== 0 && !options?.wasmSafe) {
    const tempVal = (adjustments.colorTemperature / 100).toFixed(2);
    if (adjustments.colorTemperature > 0) {
      vfilters.push(`colorbalance=rs=${tempVal}:gs=0.0:bs=-${tempVal}`);
    } else {
      vfilters.push(`colorbalance=rs=${tempVal}:gs=0.0:bs=${Math.abs(Number(tempVal)).toFixed(2)}`);
    }
  }

  if (adjustments.playbackSpeed && adjustments.playbackSpeed !== 1.0) {
    const ptsMultiplier = (1 / adjustments.playbackSpeed).toFixed(3);
    vfilters.push(`setpts=${ptsMultiplier}*PTS`);
    afilters.push(`atempo=${adjustments.playbackSpeed.toFixed(3)}`);
  }

  if (adjustments.audioVolume !== 100) {
    const volRatio = (adjustments.audioVolume / 100).toFixed(2);
    afilters.push(`volume=${volRatio}`);
  }

  return { vfilters, afilters };
}

function qualitySettings(quality: QualityTier): { crf: string; bitrate: string } {
  if (quality === 'high' || quality === 'original') {
    return { crf: '18', bitrate: '12M' };
  }
  if (quality === 'compressed') {
    return { crf: '28', bitrate: '2M' };
  }
  return { crf: '23', bitrate: '6M' };
}

export function generateFFmpegArgs(
  inputFilename: string,
  outputFilename: string,
  adjustments: VideoAdjustments,
  format: AspectRatioFormat,
  quality: QualityTier,
  optional?: OptionalElementsConfig,
  metadata?: VariantFileMetadata,
  options?: FFmpegGenerateOptions
): string[] {
  const { vfilters, afilters } = buildFilterChains(adjustments, format, quality, optional, options);
  const { crf, bitrate } = qualitySettings(quality);
  const preset = options?.preset ?? 'medium';

  const args: string[] = ['-i', inputFilename];
  if (vfilters.length > 0) args.push('-vf', vfilters.join(','));
  if (afilters.length > 0) args.push('-af', afilters.join(','));
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', crf);
  if (!options?.wasmSafe) {
    args.push('-maxrate', bitrate, '-bufsize', '20M');
  }
  args.push('-preset', preset, '-threads', '1', '-c:a', 'aac', '-b:a', options?.wasmSafe ? '128k' : '192k');
  if (options?.wasmSafe) {
    args.push('-movflags', '+use_metadata_tags');
  } else {
    args.push('-movflags', '+faststart+use_metadata_tags');
  }
  if (metadata) args.push(...metadataFfmpegArgList(metadata));
  args.push(outputFilename);
  return args;
}

export function generateMinimalWasmArgs(
  inputFilename: string,
  outputFilename: string,
  format: AspectRatioFormat,
  quality: QualityTier,
  source?: { width: number; height: number }
): string[] {
  const res = getResolutionForFormat(format, quality, source);
  return [
    '-i',
    inputFilename,
    '-vf',
    `scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'ultrafast',
    '-crf',
    '23',
    '-threads',
    '1',
    '-an',
    outputFilename,
  ];
}

export function generateFFmpegArgsWithoutAudio(args: string[]): string[] {
  const next: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const current = args[i];
    const following = args[i + 1];
    if (current === '-af' || current === '-c:a' || current === '-b:a') {
      i += 1;
      continue;
    }
    if (current === '-map' && following === '0:a?') {
      i += 1;
      continue;
    }
    next.push(current);
  }
  const outputFilename = next.pop();
  if (!outputFilename) return ['-an'];
  return [...next, '-an', outputFilename];
}

export function generateFFmpegCommand(
  inputFilename: string,
  outputFilename: string,
  adjustments: VideoAdjustments,
  format: AspectRatioFormat,
  quality: QualityTier,
  optional?: OptionalElementsConfig,
  metadata?: VariantFileMetadata,
  options?: FFmpegGenerateOptions
): string {
  const args = generateFFmpegArgs(
    inputFilename,
    outputFilename,
    adjustments,
    format,
    quality,
    optional,
    metadata,
    { preset: 'medium', includeDrawtext: true, ...options }
  );

  const quoted = args.map((arg, i) => {
    const prev = args[i - 1];
    if (prev === '-i' || i === args.length - 1) return `"${arg}"`;
    if (prev === '-vf' || prev === '-af') return `"${arg}"`;
    if (prev === '-metadata') {
      const eq = arg.indexOf('=');
      if (eq === -1) return arg;
      return `${arg.slice(0, eq)}="${arg.slice(eq + 1).replace(/"/g, "'")}"`;
    }
    return arg;
  });

  return `ffmpeg -y ${quoted.join(' ')}`.replace(/\s+/g, ' ');
}

export function generateRandomizedAdjustments(base: VideoAdjustments, variantIndex: number): VideoAdjustments {
  const seed = (variantIndex + 1) * 17.3;
  const pseudoRand = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  return {
    ...base,
    rotation: Number((base.rotation + (pseudoRand(1) - 0.5) * 0.6).toFixed(2)),
    brightness: Math.round(base.brightness + (pseudoRand(2) - 0.5) * 4),
    contrast: Number((base.contrast + (pseudoRand(3) - 0.5) * 0.04).toFixed(3)),
    saturation: Math.round(base.saturation + (pseudoRand(4) - 0.5) * 6),
    colorTemperature: Math.round(base.colorTemperature + (pseudoRand(5) - 0.5) * 8),
    playbackSpeed: Number((base.playbackSpeed + (pseudoRand(6) - 0.5) * 0.01).toFixed(3)),
    zoomPercent: Number((Math.max(100, base.zoomPercent) + 0.4 + pseudoRand(7) * 1.6).toFixed(1)),
    horizontalFlip: false,
  };
}
