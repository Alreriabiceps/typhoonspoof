export function formatClockDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  const size = bytes / (1024 * 1024);
  return `${Math.max(0, size).toFixed(1)} MB`;
}

export function estimateVariantSizeMb(
  sourceBytes: number,
  quality: 'original' | 'high' | 'medium' | 'compressed',
  playbackSpeed: number
): string {
  const speed = playbackSpeed || 1;
  const qualityFactor = quality === 'compressed' ? 0.35 : quality === 'medium' ? 0.65 : 0.9;
  const size = (sourceBytes / (1024 * 1024)) * qualityFactor / speed;
  return `${Math.max(0, size).toFixed(1)} MB`;
}

export function getCssAspectRatio(ratio: string, resolutionLabel?: string): string {
  switch (ratio) {
    case '9:16':
      return '9 / 16';
    case '4:5':
      return '4 / 5';
    case '1:1':
      return '1 / 1';
    case '21:9':
      return '21 / 9';
    case '16:9':
      return '16 / 9';
    default: {
      const match = resolutionLabel?.match(/(\d+)\s*x\s*(\d+)/i);
      if (match) return `${match[1]} / ${match[2]}`;
      return '16 / 9';
    }
  }
}

export function isPortraitRatio(ratio: string): boolean {
  return ratio === '9:16' || ratio === '4:5';
}
