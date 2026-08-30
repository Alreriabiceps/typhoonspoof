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

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return bytes;
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

function findBox(bytes: Uint8Array, type: string, start = 0, end = bytes.length) {
  let offset = start;
  while (offset + 8 <= end) {
    let size = readU32(bytes, offset);
    const boxType = readAscii(bytes, offset + 4, 4);
    let header = 8;
    if (size === 1 && offset + 16 <= end) {
      header = 16;
      size = Number((BigInt(readU32(bytes, offset + 8)) << 32n) + BigInt(readU32(bytes, offset + 12)));
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header) break;
    if (boxType === type) return { offset, size, header };
    offset += size;
  }
  return null;
}

function buildUuidBox(metadata: VariantFileMetadata): Uint8Array {
  const payload = new TextEncoder().encode(
    JSON.stringify({
      title: metadata.title,
      comment: metadata.comment,
      encoder: metadata.encoder,
      creation_time: metadata.creationTime,
    })
  );
  const size = 8 + 16 + payload.length;
  const box = new Uint8Array(size);
  writeU32(box, 0, size);
  box[4] = 0x75; // u
  box[5] = 0x75; // u
  box[6] = 0x69; // i
  box[7] = 0x64; // d
  box.set(uuidToBytes(metadata.uuid), 8);
  box.set(payload, 24);
  return box;
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

function insertAfter(bytes: Uint8Array, insertAt: number, extra: Uint8Array): Uint8Array {
  const next = new Uint8Array(bytes.length + extra.length);
  next.set(bytes.subarray(0, insertAt), 0);
  next.set(extra, insertAt);
  next.set(bytes.subarray(insertAt), insertAt + extra.length);
  return next;
}

function readVint(bytes: Uint8Array, offset: number): { value: number; length: number } | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && (first & mask) === 0) {
    length += 1;
    mask >>= 1;
  }
  if (length > 8 || offset + length > bytes.length) return null;
  let value = first & (mask - 1);
  for (let i = 1; i < length; i++) value = (value << 8) | bytes[offset + i];
  return { value, length };
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
    const ftyp = findBox(bytes, 'ftyp');
    if (!ftyp) return bytes;
    const withUuid = insertAfter(bytes, ftyp.offset + ftyp.size, buildUuidBox(metadata));
    patchMp4Times(withUuid, metadata);
    return withUuid;
  }

  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const id = readVint(bytes, 0);
    const size = id ? readVint(bytes, id.length) : null;
    if (id && size) {
      const headerEnd = id.length + size.length + size.value;
      if (headerEnd > 0 && headerEnd < bytes.length) {
        return insertAfter(bytes, headerEnd, buildWebmVoid(metadata));
      }
    }
  }

  return bytes;
}

export async function applyMetadataSpoof(file: Blob, metadata: VariantFileMetadata): Promise<Blob> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const spoofed = spoofContainerBytes(buffer, metadata);
  if (spoofed === buffer) return file;
  return new Blob([spoofed], { type: file.type || 'video/mp4' });
}
