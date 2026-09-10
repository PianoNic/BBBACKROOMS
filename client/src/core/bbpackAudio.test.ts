import { describe, it, expect } from "vitest";
import { decodeBbpack, encodeBbpack, type BbpackAsset } from "./bbpack";

function bytesOf(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>;
}

describe("bbpack audio assets", () => {
  it("round-trips a manifest and assets that mix image and audio", () => {
    const manifest = {
      id: "spooky-pack",
      version: "1.0.0",
      name: "Spooky Pack",
      teachers: { "0": { image: "teachers/mr-smith.jpg", sound: "teachers/mr-smith-taunt.mp3" } },
      sounds: { "jumpscare.hit": "sounds/jumpscare-hit.mp3" },
      music: { "music.title": "music/music-title.mp3" },
    };

    const imageBytes = bytesOf("fake-jpeg-bytes");
    const soundBytes = bytesOf("fake-mp3-bytes-sound");
    const musicBytes = bytesOf("fake-mp3-bytes-music");
    const tauntBytes = bytesOf("fake-mp3-bytes-taunt");

    const assets: BbpackAsset[] = [
      { name: "teachers/mr-smith.jpg", mime: "image/jpeg", bytes: imageBytes },
      { name: "sounds/jumpscare-hit.mp3", mime: "audio/mpeg", bytes: soundBytes },
      { name: "music/music-title.mp3", mime: "audio/mpeg", bytes: musicBytes },
      { name: "teachers/mr-smith-taunt.mp3", mime: "audio/mpeg", bytes: tauntBytes },
    ];

    const encoded = encodeBbpack(manifest, assets);
    const decoded = decodeBbpack(encoded);

    expect(decoded.manifest).toEqual(manifest);
    expect(decoded.assets).toHaveLength(assets.length);

    const decodedByName = new Map(decoded.assets.map((a) => [a.name, a]));
    for (const original of assets) {
      const found = decodedByName.get(original.name);
      expect(found).toBeDefined();
      expect(found?.mime).toBe(original.mime);
      expect(found?.bytes).toEqual(original.bytes);
    }
  });

  it("rejects an unsupported mime type on encode", () => {
    const assets: BbpackAsset[] = [
      { name: "sounds/clip.flac", mime: "audio/flac", bytes: bytesOf("nope") },
    ];
    expect(() => encodeBbpack({ id: "p", version: "1.0.0", name: "P", teachers: {} }, assets))
      .toThrow(/unsupported mime/);
  });

  it("rejects an unsupported mime type on decode", () => {
    const assets: BbpackAsset[] = [
      { name: "sounds/clip.mp3", mime: "audio/mpeg", bytes: bytesOf("legit") },
    ];
    const encoded = encodeBbpack({ id: "p", version: "1.0.0", name: "P", teachers: {} }, assets);

    const mpegMimeBytes = new TextEncoder().encode("audio/mpeg");
    const flacMimeBytes = new TextEncoder().encode("audio/flac");
    expect(flacMimeBytes.length).toBe(mpegMimeBytes.length);

    const mimeOffset = findMimeOffset(encoded, mpegMimeBytes);
    const patched = encoded.slice() as Uint8Array<ArrayBuffer>;
    patched.set(flacMimeBytes, mimeOffset);

    expect(() => decodeBbpack(patched)).toThrow(/unsupported mime/);
  });
});

function findMimeOffset(bytes: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  throw new Error("mime bytes not found");
}
