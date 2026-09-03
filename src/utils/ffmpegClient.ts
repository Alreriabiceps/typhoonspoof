import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const CORE_VERSION = '0.12.6';

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

function coreBases(): string[] {
  const local = `${String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/ffmpeg`;
  return [
    local,
    `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
    `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`,
  ];
}

async function loadFromBase(instance: FFmpeg, base: string) {
  await instance.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  });
}

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    let lastError: unknown;
    for (const base of coreBases()) {
      const instance = new FFmpeg();
      try {
        await loadFromBase(instance, base);
        return instance;
      } catch (error) {
        lastError = error;
        try {
          instance.terminate();
        } catch {
          // Ignore terminate failures from a half-loaded core.
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Could not load encoder');
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
    const source = data instanceof Uint8Array ? data : new Uint8Array(data);
    const copy = new Uint8Array(source.byteLength);
    copy.set(source);
    onProgress?.(1);
    const copyBuffer = copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength);
    return new Blob([copyBuffer], { type: 'video/mp4' });
  } finally {
    instance.off('progress', handleProgress);
    instance.off('log', handleLog);
    await safeDelete(instance, outputName);
  }
}
