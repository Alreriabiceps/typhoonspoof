import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const CORE_VERSION = '0.12.6';
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

function parseTimecode(message: string): number | null {
  const match = message.match(/time=\s*(-?\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  if (hours < 0) return 0;
  return hours * 3600 + minutes * 60 + seconds;
}

async function loadCore(instance: FFmpeg) {
  await instance.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  });
}

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const instance = new FFmpeg();
    await loadCore(instance);
    return instance;
  })();

  try {
    ffmpeg = await loadPromise;
    return ffmpeg;
  } catch (error) {
    loadPromise = null;
    ffmpeg = null;
    throw error;
  }
}

async function safeDelete(instance: FFmpeg, name: string) {
  try {
    await instance.deleteFile(name);
  } catch {
    // File may not exist.
  }
}

export async function writeInputFile(name: string, file: Blob) {
  const instance = await getFFmpeg();
  await safeDelete(instance, name);
  await instance.writeFile(name, await fetchFile(file));
}

export async function deleteInputFile(name: string) {
  if (!ffmpeg?.loaded) return;
  await safeDelete(ffmpeg, name);
}

export function terminateFFmpeg() {
  if (!ffmpeg) {
    loadPromise = null;
    return;
  }
  ffmpeg.terminate();
  ffmpeg = null;
  loadPromise = null;
}

export async function recoverEncoder(inputName: string, file: Blob) {
  terminateFFmpeg();
  await getFFmpeg();
  await writeInputFile(inputName, file);
}

export async function encodeToBlob(
  args: string[],
  outputName: string,
  onProgress?: (ratio: number) => void,
  options?: { durationSeconds?: number; onLog?: (message: string) => void }
): Promise<Blob> {
  const instance = await getFFmpeg();
  const duration = options?.durationSeconds && options.durationSeconds > 0 ? options.durationSeconds : 0;
  const logs: string[] = [];

  const handleProgress = ({ progress }: { progress: number }) => {
    if (!Number.isFinite(progress)) return;
    onProgress?.(Math.min(0.99, Math.max(0, progress)));
  };

  const handleLog = ({ message }: { message: string }) => {
    if (!message) return;
    logs.push(message);
    if (logs.length > 40) logs.shift();
    if (/frame=|time=/.test(message)) options?.onLog?.(message);
    if (!duration) return;
    const seconds = parseTimecode(message);
    if (seconds == null) return;
    onProgress?.(Math.min(0.99, Math.max(0, seconds / duration)));
  };

  await safeDelete(instance, outputName);
  instance.on('progress', handleProgress);
  instance.on('log', handleLog);
  try {
    const code = await instance.exec(args, 8 * 60 * 1000);
    if (code !== 0) {
      const hint = logs.slice(-6).join(' | ') || `code ${code}`;
      throw new Error(`Encoder failed: ${hint}`);
    }
    const data = await instance.readFile(outputName);
    if (typeof data === 'string') {
      throw new Error('Encoder returned text instead of video bytes');
    }
    onProgress?.(1);
    return new Blob([data], { type: 'video/mp4' });
  } finally {
    instance.off('progress', handleProgress);
    instance.off('log', handleLog);
    await safeDelete(instance, outputName);
  }
}
