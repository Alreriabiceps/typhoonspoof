import { DEFAULT_ADJUSTMENTS, DEFAULT_METADATA_TEMPLATE, DEFAULT_OPTIONAL_ELEMENTS } from '../src/data/presets';
import { advanceGenerationTick, buildInitialVariants } from '../src/utils/buildVariants';
import { formatClockDuration, estimateVariantSizeMb } from '../src/utils/format';
import { generateFFmpegArgs, generateFFmpegCommand, getResolutionForFormat } from '../src/utils/ffmpegGenerator';
import { buildVariantMetadata, spoofContainerBytes } from '../src/utils/metadataSpoof';
import { SourceVideo, VariantConfig } from '../src/types';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function readAsciiForTest(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

const source: SourceVideo = {
  id: 'test',
  name: 'clip.mp4',
  size: 10 * 1024 * 1024,
  formattedSize: '10.0 MB',
  duration: 75,
  formattedDuration: '01:15',
  resolution: { width: 1280, height: 720, label: '1280x720' },
  fps: 30,
  bitrate: '1.0 Mbps',
  codec: 'H.264',
  audioChannels: 'Stereo',
  url: 'blob:test',
  thumbnailUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
};

const config: VariantConfig = {
  variantCount: 4,
  mode: 'randomized',
  format: '9:16',
  quality: 'high',
  adjustments: DEFAULT_ADJUSTMENTS,
  optionalElements: DEFAULT_OPTIONAL_ELEMENTS,
  metadataTemplate: DEFAULT_METADATA_TEMPLATE,
};

assert(formatClockDuration(75) === '01:15', 'duration should format minutes');
assert(formatClockDuration(8) === '00:08', 'duration should pad seconds');
assert(estimateVariantSizeMb(10 * 1024 * 1024, 'high', 1) === '9.0 MB', 'size estimate');

const originalRes = getResolutionForFormat('original', 'high', source.resolution);
assert(originalRes.width === 1280 && originalRes.height === 720, 'original resolution should follow source');

const variants = buildInitialVariants(source, config);
assert(variants.length === 4, 'should build requested variant count');
assert(variants[0].status === 'processing', 'first variant starts processing');
assert(variants[1].status === 'queued', 'later variants start queued');
assert(variants.every((v) => v.aspectRatio === '9:16'), 'variants should keep the selected format');
assert(variants[0].ffmpegCommand.includes('ffmpeg'), 'each variant needs an ffmpeg command');
assert(variants[0].videoUrl === source.url, 'variants should use uploaded video url');
assert(variants.every((v) => !v.ffmpegCommand.includes('hflip')), 'flip must never be used');
assert(variants.every((v) => v.adjustments.horizontalFlip === false), 'flip flag must stay off');
assert(
  new Set(variants.map((v) => JSON.stringify(v.adjustments))).size === variants.length,
  'each variant should have a unique fingerprint'
);
assert(
  variants.every((v) => Math.abs(v.adjustments.rotation) <= 1),
  'rotation should stay minimal'
);
assert(variants.every((v) => v.metadata?.uuid && v.ffmpegCommand.includes('-map_metadata -1')), 'metadata spoof flags required');
assert(new Set(variants.map((v) => v.metadata.uuid)).size === variants.length, 'each variant needs a unique metadata id');

const meta = buildVariantMetadata(1);
const cmd = generateFFmpegCommand('in.mp4', 'out.mp4', DEFAULT_ADJUSTMENTS, '9:16', 'high', undefined, meta);
assert(cmd.includes('-i "in.mp4"'), 'ffmpeg command should include input');
assert(cmd.includes('out.mp4'), 'ffmpeg command should include output');
assert(cmd.includes('-map_metadata -1'), 'ffmpeg command should strip source metadata');
assert(cmd.includes(meta.uuid.slice(0, 8)), 'ffmpeg command should carry unique metadata');

const args = generateFFmpegArgs('in.mp4', 'out.mp4', DEFAULT_ADJUSTMENTS, '9:16', 'high', undefined, meta, {
  preset: 'ultrafast',
  includeDrawtext: false,
  source: source.resolution,
  wasmSafe: true,
});
assert(args[0] === '-i' && args[1] === 'in.mp4', 'ffmpeg args should start with input');
assert(args.includes('out.mp4'), 'ffmpeg args should include output');
assert(args.includes('-map_metadata'), 'ffmpeg args should strip source metadata');
assert(args.includes('ultrafast'), 'wasm args should use a fast preset');
assert(args.includes('aac'), 'wasm args should encode audio as aac');
assert(!args.includes('+faststart+use_metadata_tags'), 'wasm args should not use faststart');
assert(!args.some((arg) => arg.includes('drawtext')), 'wasm args should skip drawtext');

const ftyp = new Uint8Array([
  0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0, 0x69, 0x73, 0x6f, 0x6d,
  0, 0, 0, 16, 0x6d, 0x64, 0x61, 0x74, 1, 2, 3, 4, 5, 6, 7, 8,
]);
const a = spoofContainerBytes(ftyp, buildVariantMetadata(1));
const b = spoofContainerBytes(ftyp, buildVariantMetadata(2));
assert(a.length > ftyp.length, 'mp4 spoof should insert a unique box');
assert(Buffer.from(a).toString('hex') !== Buffer.from(b).toString('hex'), 'spoofed containers must differ');
assert(
  Buffer.from(a.subarray(0, ftyp.length)).equals(Buffer.from(ftyp)),
  'mp4 spoof must append after mdat so chunk offsets stay valid'
);
assert(readAsciiForTest(a, ftyp.length + 4, 4) === 'uuid', 'appended box should be a uuid atom');

let currentIdx = 0;
let variantProg = 10;
let current = variants;
let steps = 0;
let done = false;
while (!done && steps < 80) {
  const tick = advanceGenerationTick(current, currentIdx, variantProg);
  current = tick.variants;
  currentIdx = tick.currentIdx;
  variantProg = tick.variantProg;
  done = tick.done;
  steps += 1;
}

assert(done, 'generation tick loop should finish');
assert(current.every((v) => v.status === 'completed' && v.progress === 100), 'all variants should complete');
assert(current.length === 4, 'completed set should keep all variants');

console.log('logic checks passed');
