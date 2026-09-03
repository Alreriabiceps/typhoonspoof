import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/@ffmpeg/core/dist/esm');
const dest = join(root, 'public/ffmpeg');

if (!existsSync(src)) {
  console.warn('Skipping ffmpeg copy: @ffmpeg/core is not installed');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('Copied ffmpeg core into public/ffmpeg');
