export type BbpackAsset = { name: string; mime: string; bytes: Uint8Array<ArrayBuffer> };

export const BBPACK_MAX_BYTES = 64 * 1024 * 1024;
export const BBPACK_MAX_ASSETS = 256;

const MAGIC = [0x42, 0x42, 0x50, 0x4b];
const FORMAT_VERSION = 1;
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
]);

export function encodeBbpack(manifest: unknown, assets: BbpackAsset[]): Uint8Array<ArrayBuffer> {
  if (assets.length > BBPACK_MAX_ASSETS) {
    throw new Error(`more than ${BBPACK_MAX_ASSETS} assets`);
  }

  const seenNames = new Set<string>();
  const encoder = new TextEncoder();
  const manifestBytes = encoder.encode(JSON.stringify(manifest));

  type PreparedAsset = { nameBytes: Uint8Array; mimeBytes: Uint8Array; bytes: Uint8Array };
  const prepared: PreparedAsset[] = [];

  for (const asset of assets) {
    if (seenNames.has(asset.name)) {
      throw new Error(`duplicate asset name "${asset.name}"`);
    }
    seenNames.add(asset.name);

    const nameBytes = encoder.encode(asset.name);
    if (nameBytes.length === 0) throw new Error("asset name must not be empty");
    if (nameBytes.length > 0xffff) throw new Error(`asset name "${asset.name}" is too long`);

    if (!ALLOWED_MIME.has(asset.mime)) {
      throw new Error(`asset "${asset.name}" has unsupported mime "${asset.mime}"`);
    }
    const mimeBytes = encoder.encode(asset.mime);

    prepared.push({ nameBytes, mimeBytes, bytes: asset.bytes });
  }

  let total = 4 + 2 + 2 + 4 + manifestBytes.length + 4;
  for (const p of prepared) {
    total += 2 + p.nameBytes.length + 1 + p.mimeBytes.length + 4 + p.bytes.length;
  }

  if (total > BBPACK_MAX_BYTES) {
    throw new Error(`pack exceeds ${BBPACK_MAX_BYTES} bytes`);
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let offset = 0;

  out.set(MAGIC, offset);
  offset += 4;

  view.setUint16(offset, FORMAT_VERSION, true);
  offset += 2;

  view.setUint16(offset, 0, true);
  offset += 2;

  view.setUint32(offset, manifestBytes.length, true);
  offset += 4;

  out.set(manifestBytes, offset);
  offset += manifestBytes.length;

  view.setUint32(offset, prepared.length, true);
  offset += 4;

  for (const p of prepared) {
    view.setUint16(offset, p.nameBytes.length, true);
    offset += 2;
    out.set(p.nameBytes, offset);
    offset += p.nameBytes.length;

    view.setUint8(offset, p.mimeBytes.length);
    offset += 1;
    out.set(p.mimeBytes, offset);
    offset += p.mimeBytes.length;

    view.setUint32(offset, p.bytes.length, true);
    offset += 4;
    out.set(p.bytes, offset);
    offset += p.bytes.length;
  }

  return out;
}

export function decodeBbpack(bytes: Uint8Array<ArrayBuffer>): { manifest: unknown; assets: BbpackAsset[] } {
  if (bytes.length < 16 || bytes.length > BBPACK_MAX_BYTES) {
    throw new Error("invalid bbpack size");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;

  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error("invalid bbpack magic");
  }
  offset += 4;

  const version = view.getUint16(offset, true);
  offset += 2;
  if (version !== FORMAT_VERSION) throw new Error("unsupported bbpack version");

  const reserved = view.getUint16(offset, true);
  offset += 2;
  if (reserved !== 0) throw new Error("invalid bbpack reserved field");

  const manifestLength = view.getUint32(offset, true);
  offset += 4;
  if (offset + manifestLength + 4 > bytes.length) {
    throw new Error("bbpack manifest length out of bounds");
  }

  const manifestBytes = bytes.slice(offset, offset + manifestLength);
  offset += manifestLength;

  let manifest: unknown;
  try {
    manifest = JSON.parse(decoder.decode(manifestBytes));
  } catch {
    throw new Error("manifest is not valid JSON");
  }

  const assetCount = view.getUint32(offset, true);
  offset += 4;
  if (assetCount > BBPACK_MAX_ASSETS) {
    throw new Error(`bbpack declares more than ${BBPACK_MAX_ASSETS} assets`);
  }

  const assets: BbpackAsset[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < assetCount; i++) {
    if (offset + 2 > bytes.length) throw new Error("bbpack truncated at asset name length");
    const nameLength = view.getUint16(offset, true);
    offset += 2;

    if (offset + nameLength > bytes.length) throw new Error("bbpack truncated at asset name");
    const name = decoder.decode(bytes.slice(offset, offset + nameLength));
    offset += nameLength;
    if (name.length === 0) throw new Error("bbpack asset name must not be empty");

    if (offset + 1 > bytes.length) throw new Error("bbpack truncated at asset mime length");
    const mimeLength = view.getUint8(offset);
    offset += 1;

    if (offset + mimeLength > bytes.length) throw new Error("bbpack truncated at asset mime");
    const mime = decoder.decode(bytes.slice(offset, offset + mimeLength));
    offset += mimeLength;
    if (!ALLOWED_MIME.has(mime)) throw new Error(`bbpack asset "${name}" has unsupported mime "${mime}"`);

    if (offset + 4 > bytes.length) throw new Error("bbpack truncated at asset data length");
    const dataLength = view.getUint32(offset, true);
    offset += 4;

    if (offset + dataLength > bytes.length) throw new Error("bbpack truncated at asset data");
    const data = bytes.slice(offset, offset + dataLength);
    offset += dataLength;

    if (seenNames.has(name)) throw new Error(`duplicate asset name "${name}"`);
    seenNames.add(name);

    assets.push({ name, mime, bytes: data });
  }

  if (offset !== bytes.length) throw new Error("bbpack has trailing bytes");

  return { manifest, assets };
}
