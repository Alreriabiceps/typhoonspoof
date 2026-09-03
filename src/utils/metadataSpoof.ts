import { MetadataTemplate, VariantFileMetadata } from '../types';
import { DEFAULT_METADATA_TEMPLATE } from '../data/presets';

export type { VariantFileMetadata };

export function applyMetadataPattern(pattern: string, tokens: Record<string, string>): string {
  return pattern.replace(/\{(n|uuid|uuid8|rev)\}/g, (_, key) => tokens[key] ?? '');
}

export function metadataTokens(variantNumber: number, uuid: string): Record<string, string> {
  return {
    n: variantNumber.toString().padStart(2, '0'),
    uuid,
    uuid8: uuid.slice(0, 8),
    rev: String(110 + (variantNumber % 40)),
  };
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildVariantMetadata(
  variantNumber: number,
  template: MetadataTemplate = DEFAULT_METADATA_TEMPLATE,
  uuid = randomUuid()
): VariantFileMetadata {
  const tokens = metadataTokens(variantNumber, uuid);
  const created = new Date(Date.now() - variantNumber * 37_000);
  return {
    uuid,
    title: applyMetadataPattern(template.titlePattern || DEFAULT_METADATA_TEMPLATE.titlePattern, tokens),
    comment: applyMetadataPattern(template.commentPattern || DEFAULT_METADATA_TEMPLATE.commentPattern, tokens),
    encoder: applyMetadataPattern(template.encoderPattern || DEFAULT_METADATA_TEMPLATE.encoderPattern, tokens),
    creationTime: created.toISOString().replace(/\.\d{3}Z$/, '.000000Z'),
  };
}

export function metadataFfmpegArgList(metadata: VariantFileMetadata): string[] {
  return [
    '-map_metadata',
    '-1',
    '-metadata',
    `title=${metadata.title}`,
    '-metadata',
    `comment=${metadata.comment}`,
    '-metadata',
    `encoder=${metadata.encoder}`,
    '-metadata',
    `creation_time=${metadata.creationTime}`,
  ];
}

export function metadataFfmpegArgs(metadata: VariantFileMetadata): string {
  const esc = (value: string) => value.replace(/"/g, "'");
  return [
    '-map_metadata -1',
    `-metadata title="${esc(metadata.title)}"`,
    `-metadata comment="${esc(metadata.comment)}"`,
    `-metadata encoder="${esc(metadata.encoder)}"`,
    `-metadata creation_time="${esc(metadata.creationTime)}"`,
    '-movflags +use_metadata_tags',
  ].join(' ');
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

function writeU32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

type Mp4Box = { offset: number; size: number; header: number; type: string };

function readBoxAt(bytes: Uint8Array, offset: number, end = bytes.length): Mp4Box | null {
  if (offset + 8 > end) return null;
  let size = readU32(bytes, offset);
  const type = readAscii(bytes, offset + 4, 4);
  let header = 8;
  if (size === 1 && offset + 16 <= end) {
    header = 16;
    size = Number((BigInt(readU32(bytes, offset + 8)) << 32n) + BigInt(readU32(bytes, offset + 12)));
  } else if (size === 0) {
    size = end - offset;
  }
  if (size < header || offset + size > end) return null;
  return { offset, size, header, type };
}

function findBox(bytes: Uint8Array, type: string, start = 0, end = bytes.length) {
  let offset = start;
  while (offset + 8 <= end) {
    const box = readBoxAt(bytes, offset, end);
    if (!box) break;
    if (box.type === type) return box;
    offset += box.size;
  }
  return null;
}

function listTopLevelBoxes(bytes: Uint8Array): Mp4Box[] {
  const boxes: Mp4Box[] = [];
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const box = readBoxAt(bytes, offset);
    if (!box) break;
    boxes.push(box);
    offset += box.size;
  }
  return boxes;
}

function patchChunkOffsets(bytes: Uint8Array, moovStart: number, moovEnd: number, delta: number) {
  if (delta === 0) return;
  const containers = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts']);
  const walk = (start: number, end: number) => {
    let cursor = start;
    while (cursor + 8 <= end) {
      const box = readBoxAt(bytes, cursor, end);
      if (!box) break;
      if (box.type === 'stco' && cursor + box.header + 8 <= end) {
        const count = readU32(bytes, cursor + box.header + 4);
        let pointer = cursor + box.header + 8;
        for (let i = 0; i < count && pointer + 4 <= end; i += 1, pointer += 4) {
          writeU32(bytes, pointer, (readU32(bytes, pointer) + delta) >>> 0);
        }
      }
      if (box.type === 'co64' && cursor + box.header + 8 <= end) {
        const count = readU32(bytes, cursor + box.header + 4);
        let pointer = cursor + box.header + 8;
        for (let i = 0; i < count && pointer + 8 <= end; i += 1, pointer += 8) {
          const value =
            (BigInt(readU32(bytes, pointer)) << 32n) + BigInt(readU32(bytes, pointer + 4)) + BigInt(delta);
          writeU32(bytes, pointer, Number(value >> 32n));
          writeU32(bytes, pointer + 4, Number(value & 0xffffffffn));
        }
      }
      if (containers.has(box.type)) {
        walk(cursor + box.header, cursor + box.size);
      }
      cursor += box.size;
    }
  };
  walk(moovStart, moovEnd);
}

export function makeMp4Faststart(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 16 || readAscii(bytes, 4, 4) !== 'ftyp') return bytes;
  const boxes = listTopLevelBoxes(bytes);
  const mdat = boxes.find((box) => box.type === 'mdat');
  const moov = boxes.find((box) => box.type === 'moov');
  if (!mdat || !moov || moov.offset < mdat.offset) return bytes;

  const head = boxes.filter((box) => box.type !== 'mdat' && box.type !== 'moov' && box.offset < mdat.offset);
  const middle = boxes.filter((box) => box.offset > mdat.offset && box.offset < moov.offset);
  const tail = boxes.filter((box) => box.offset > moov.offset);
  const newMdatOffset = head.reduce((total, box) => total + box.size, 0) + moov.size;
  const delta = newMdatOffset - mdat.offset;

  const output = new Uint8Array(bytes.length);
  let written = 0;
  const copyBox = (box: Mp4Box) => {
    output.set(bytes.subarray(box.offset, box.offset + box.size), written);
    written += box.size;
  };
  for (const box of head) copyBox(box);
  const moovStart = written;
  copyBox(moov);
  copyBox(mdat);
  for (const box of middle) copyBox(box);
  for (const box of tail) copyBox(box);
  if (written !== bytes.length) return bytes;
  patchChunkOffsets(output, moovStart, moovStart + moov.size, delta);
  return output;
}

export function bytesToVideoBlob(bytes: Uint8Array): Blob {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Blob([copy], { type: 'video/mp4' });
}

function isoToMp4Time(iso: string): number {
  const unix = Math.floor(new Date(iso).getTime() / 1000);
  return unix + 2082844800;
}

function patchMp4Times(bytes: Uint8Array, metadata: VariantFileMetadata) {
  const moov = findBox(bytes, 'moov');
  if (!moov) return;
  const stamp = isoToMp4Time(metadata.creationTime);
  const stampBoxes = new Set(['mvhd', 'tkhd', 'mdhd']);
  const containers = new Set(['trak', 'mdia', 'minf', 'edts']);

  const walk = (start: number, end: number) => {
    let cursor = start;
    while (cursor + 8 <= end) {
      let size = readU32(bytes, cursor);
      const type = readAscii(bytes, cursor + 4, 4);
      let header = 8;
      if (size === 1) {
        header = 16;
        size = Number((BigInt(readU32(bytes, cursor + 8)) << 32n) + BigInt(readU32(bytes, cursor + 12)));
      }
      if (size < header) break;
      if (stampBoxes.has(type) && cursor + header + 12 <= end) {
        const version = bytes[cursor + header];
        if (version === 0) {
          writeU32(bytes, cursor + header + 4, stamp);
          writeU32(bytes, cursor + header + 8, stamp);
        }
      }
      if (containers.has(type)) {
        walk(cursor + header, cursor + size);
      }
      cursor += size;
    }
  };

  walk(moov.offset + moov.header, moov.offset + moov.size);
}

function appendBytes(bytes: Uint8Array, extra: Uint8Array): Uint8Array {
  const next = new Uint8Array(bytes.length + extra.length);
  next.set(bytes, 0);
  next.set(extra, bytes.length);
  return next;
}

function buildWebmVoid(metadata: VariantFileMetadata): Uint8Array {
  const payload = new TextEncoder().encode(metadata.uuid);
  const sizeByte = 0x80 | payload.length;
  const element = new Uint8Array(2 + payload.length);
  element[0] = 0xec;
  element[1] = sizeByte;
  element.set(payload, 2);
  return element;
}

export function spoofContainerBytes(bytes: Uint8Array, metadata: VariantFileMetadata): Uint8Array {
  if (bytes.length >= 8 && readAscii(bytes, 4, 4) === 'ftyp') {
    const playable = makeMp4Faststart(bytes);
    patchMp4Times(playable, metadata);
    return playable;
  }

  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return appendBytes(bytes, buildWebmVoid(metadata));
  }

  return bytes;
}

export async function applyMetadataSpoof(file: Blob, metadata: VariantFileMetadata): Promise<Blob> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  return bytesToVideoBlob(spoofContainerBytes(buffer, metadata));
}
