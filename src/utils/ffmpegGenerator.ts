import { AspectRatioFormat, QualityTier, VideoAdjustments, OptionalElementsConfig } from '../types';

export function getResolutionForFormat(format: AspectRatioFormat, quality: QualityTier): { width: number; height: number; label: string } {
  let baseDimension = 1080;
  if (quality === 'original') baseDimension = 1080;
  else if (quality === 'high') baseDimension = 1080;
  else if (quality === 'medium') baseDimension = 720;
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
    default:
      return { width: 1920, height: 1080, label: '1920x1080 (Source)' };
  }
}

export function generateFFmpegCommand(
  inputFilename: string,
  outputFilename: string,
  adjustments: VideoAdjustments,
  format: AspectRatioFormat,
  quality: QualityTier,
  optional?: OptionalElementsConfig
): string {
  const vfilters: string[] = [];
  const afilters: string[] = [];

  // Crop / Reframe & Scale
  const res = getResolutionForFormat(format, quality);
  if (format === '9:16') {
    vfilters.push(`crop=ih*(9/16):ih`);
  } else if (format === '1:1') {
    vfilters.push(`crop=min(iw\\,ih):min(iw\\,ih)`);
  } else if (format === '4:5') {
    vfilters.push(`crop=ih*(4/5):ih`);
  }

  // Zoom
  if (adjustments.zoomPercent && adjustments.zoomPercent > 100) {
    const factor = (adjustments.zoomPercent / 100).toFixed(2);
    vfilters.push(`scale=iw*${factor}:ih*${factor},crop=iw/${factor}:ih/${factor}`);
  }

  // Scale to output
  vfilters.push(`scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2`);

  // Rotation
  if (adjustments.rotation && adjustments.rotation !== 0) {
    const rad = (adjustments.rotation * (Math.PI / 180)).toFixed(4);
    vfilters.push(`rotate=${rad}:ow=rotw(${rad}):oh=roth(${rad})`);
  }

  // Horizontal flip
  if (adjustments.horizontalFlip) {
    vfilters.push(`hflip`);
  }

  // Color adjustments (eq filter)
  const brightnessVal = (adjustments.brightness / 100).toFixed(2);
  const contrastVal = adjustments.contrast.toFixed(2);
  const saturationVal = (adjustments.saturation / 100).toFixed(2);
  
  if (adjustments.brightness !== 0 || adjustments.contrast !== 1.0 || adjustments.saturation !== 100) {
    vfilters.push(`eq=brightness=${brightnessVal}:contrast=${contrastVal}:saturation=${saturationVal}`);
  }

  // Color Temperature (approx with colorbalance)
  if (adjustments.colorTemperature !== 0) {
    const tempVal = (adjustments.colorTemperature / 100).toFixed(2);
    if (adjustments.colorTemperature > 0) {
      // Warm: boost red/yellow highlights
      vfilters.push(`colorbalance=rs=${tempVal}:gs=0.0:bs=-${tempVal}`);
    } else {
      // Cool: boost blue highlights
      vfilters.push(`colorbalance=rs=${tempVal}:gs=0.0:bs=${Math.abs(Number(tempVal)).toFixed(2)}`);
    }
  }

  // Playback speed (setpts)
  if (adjustments.playbackSpeed && adjustments.playbackSpeed !== 1.0) {
    const ptsMultiplier = (1 / adjustments.playbackSpeed).toFixed(3);
    vfilters.push(`setpts=${ptsMultiplier}*PTS`);
    afilters.push(`atempo=${adjustments.playbackSpeed.toFixed(2)}`);
  }

  // Optional Watermark
  if (optional?.watermark.enabled) {
    const wmText = optional.watermark.text || 'SAMPLE';
    const wmOpacity = (optional.watermark.opacity / 100).toFixed(2);
    let posExpr = 'x=w-tw-20:y=h-th-20';
    if (optional.watermark.position === 'top-left') posExpr = 'x=20:y=20';
    else if (optional.watermark.position === 'top-right') posExpr = 'x=w-tw-20:y=20';
    else if (optional.watermark.position === 'bottom-left') posExpr = 'x=20:y=h-th-20';
    
    vfilters.push(`drawtext=text='${wmText}':fontcolor=white@${wmOpacity}:fontsize=24:${posExpr}`);
  }

  // Optional Text Overlay
  if (optional?.textOverlay.enabled && optional.textOverlay.text) {
    const ovText = optional.textOverlay.text;
    let posExpr = 'x=(w-tw)/2:y=(h-th)/2';
    if (optional.textOverlay.position === 'top') posExpr = 'x=(w-tw)/2:y=60';
    else if (optional.textOverlay.position === 'bottom') posExpr = 'x=(w-tw)/2:y=h-th-80';

    let colorExpr = 'yellow';
    if (optional.textOverlay.style === 'clean-white') colorExpr = 'white';
    else if (optional.textOverlay.style === 'boxed-black') colorExpr = 'white:box=1:boxcolor=black@0.7:boxborderw=10';
    else if (optional.textOverlay.style === 'neon-glow') colorExpr = '#00f0ff:shadowcolor=#ff0055:shadowx=3:shadowy=3';

    vfilters.push(`drawtext=text='${ovText}':fontcolor=${colorExpr}:fontsize=${optional.textOverlay.fontSize}:${posExpr}`);
  }

  // Audio volume
  if (adjustments.audioVolume !== 100) {
    const volRatio = (adjustments.audioVolume / 100).toFixed(2);
    afilters.push(`volume=${volRatio}`);
  }

  // Quality settings
  let crf = '23';
  let bitrate = '6M';
  if (quality === 'high') {
    crf = '18';
    bitrate = '12M';
  } else if (quality === 'compressed') {
    crf = '28';
    bitrate = '2M';
  }

  const vfArg = vfilters.length > 0 ? `-vf "${vfilters.join(',')}"` : '';
  const afArg = afilters.length > 0 ? `-af "${afilters.join(',')}"` : '';

  return `ffmpeg -y -i "${inputFilename}" ${vfArg} ${afArg} -c:v libx264 -crf ${crf} -maxrate ${bitrate} -bufsize 20M -preset medium -c:a aac -b:a 192k "${outputFilename}"`.replace(/\s+/g, ' ');
}

export function generateRandomizedAdjustments(base: VideoAdjustments, variantIndex: number): VideoAdjustments {
  // Generate controlled realistic variations
  const seed = (variantIndex + 1) * 17.3;
  const pseudoRand = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const rotJitter = (pseudoRand(1) - 0.5) * 6; // -3 to +3 deg
  const brightJitter = (pseudoRand(2) - 0.5) * 30; // -15 to +15 %
  const contJitter = 1 + (pseudoRand(3) - 0.5) * 0.4; // 0.8 to 1.2
  const satJitter = 100 + (pseudoRand(4) - 0.5) * 40; // 80 to 120 %
  const tempJitter = (pseudoRand(5) - 0.5) * 40; // -20 to +20
  const speedJitter = 1 + (pseudoRand(6) - 0.5) * 0.2; // 0.9x to 1.1x
  const zoomJitter = 100 + Math.floor(pseudoRand(7) * 20); // 100% - 120%

  return {
    ...base,
    rotation: Number((base.rotation + rotJitter).toFixed(1)),
    brightness: Math.round(base.brightness + brightJitter),
    contrast: Number((base.contrast * contJitter).toFixed(2)),
    saturation: Math.round(base.saturation * (satJitter / 100)),
    colorTemperature: Math.round(base.colorTemperature + tempJitter),
    playbackSpeed: Number((base.playbackSpeed * speedJitter).toFixed(2)),
    zoomPercent: zoomJitter,
    horizontalFlip: variantIndex % 7 === 0 ? true : base.horizontalFlip,
  };
}
