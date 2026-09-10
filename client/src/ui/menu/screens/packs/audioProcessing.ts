import { MAX_MUSIC_BYTES, MAX_SOUND_BYTES } from "../../../../core/texturePacks";

export type AudioKind = "sound" | "music";

export type AudioAsset = { file: File; mime: string };

const EXT_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

const ALLOWED_AUDIO_MIME = new Set(Object.values(EXT_MIME));

export function detectAudioMime(file: File): string | null {
  if (ALLOWED_AUDIO_MIME.has(file.type)) return file.type;
  if (file.type) return null;
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  return EXT_MIME[ext] ?? null;
}

export function maxBytesFor(kind: AudioKind): number {
  return kind === "music" ? MAX_MUSIC_BYTES : MAX_SOUND_BYTES;
}

export function extensionForMime(mime: string): string {
  const found = Object.entries(EXT_MIME).find(([, m]) => m === mime);
  return found ? found[0] : "bin";
}

export function processAudioFile(file: File, kind: AudioKind): AudioAsset {
  const mime = detectAudioMime(file);
  if (!mime) throw new Error("nicht unterstütztes Format (mp3, ogg, wav oder webm)");
  const max = maxBytesFor(kind);
  if (file.size > max) {
    throw new Error(`Datei überschreitet ${Math.round(max / (1024 * 1024))} MB`);
  }
  return { file, mime };
}

export function sanitizeAssetSegment(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

export function basenameOf(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0];
  const idx = withoutQuery.lastIndexOf("/");
  return idx >= 0 ? withoutQuery.slice(idx + 1) : withoutQuery;
}

export function sizeLabelFor(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}
