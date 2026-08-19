import JSZip from "jszip";
import type { TikTokFavoriteSound } from "@/types";

export class TikTokArchiveError extends Error {
  constructor(public readonly code: "INVALID_ZIP" | "NOT_TIKTOK" | "FORMAT_UNRECOGNIZED" | "NO_FAVORITES", message: string) {
    super(message);
  }
}

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null && !Array.isArray(value);

function findFavoriteArrays(value: unknown, path = ""): unknown[][] {
  if (!isRecord(value)) return [];
  const found: unknown[][] = [];
  for (const [key, child] of Object.entries(value)) {
    const next = `${path} ${key}`.toLowerCase();
    if (Array.isArray(child) && /favou?rite.*sound|sound.*favou?rite/.test(next)) found.push(child);
    else if (isRecord(child)) found.push(...findFavoriteArrays(child, next));
  }
  return found;
}

function entryToSound(entry: unknown, index: number): TikTokFavoriteSound | null {
  if (!isRecord(entry)) return null;
  const get = (...names: string[]) => {
    const pair = Object.entries(entry).find(([key, value]) => names.includes(key.toLowerCase()) && typeof value === "string");
    return pair?.[1] as string | undefined;
  };
  const soundUrl = get("link", "url", "soundurl", "sound url");
  if (!soundUrl || !/^https?:\/\//i.test(soundUrl)) return null;
  const date = get("date", "datetime", "time");
  const displayName = get("name", "soundname", "sound name", "title");
  return { id: `${index}-${simpleHash(soundUrl)}`, soundUrl, ...(date ? { date } : {}), ...(displayName ? { displayName } : {}) };
}

function simpleHash(value: string): string {
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash).toString(36);
}

export function parseTikTokJson(text: string): TikTokFavoriteSound[] | null {
  let json: unknown;
  try { json = JSON.parse(text); } catch { return null; }
  const arrays = findFavoriteArrays(json);
  if (!arrays.length) return null;
  return arrays.flat().map(entryToSound).filter((sound): sound is TikTokFavoriteSound => sound !== null);
}

export function parseTikTokText(text: string): TikTokFavoriteSound[] | null {
  if (!/favou?rite sounds?/i.test(text)) return null;
  const section = text.slice(text.search(/favou?rite sounds?/i));
  const blocks = section.split(/\n\s*\n/);
  return blocks.flatMap((block, index) => {
    const url = block.match(/(?:Link|URL):\s*(https?:\/\/\S+)/i)?.[1];
    if (!url) return [];
    const date = block.match(/Date:\s*([^\n\r]+)/i)?.[1]?.trim();
    const displayName = block.match(/(?:Sound Name|Name):\s*([^\n\r]+)/i)?.[1]?.trim();
    return [{ id: `${index}-${simpleHash(url)}`, soundUrl: url, ...(date ? { date } : {}), ...(displayName ? { displayName } : {}) }];
  });
}

export async function parseTikTokArchive(input: Blob | ArrayBuffer): Promise<TikTokFavoriteSound[]> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(input); } catch { throw new TikTokArchiveError("INVALID_ZIP", "That file is not a readable ZIP archive."); }
  const candidates = Object.values(zip.files).filter((file) => !file.dir && /\.(json|txt)$/i.test(file.name));
  if (!candidates.length) throw new TikTokArchiveError("NOT_TIKTOK", "This ZIP does not contain a recognizable TikTok data export.");
  let recognized = false;
  for (const file of candidates) {
    const text = await file.async("string");
    const sounds = file.name.endsWith(".json") ? parseTikTokJson(text) : parseTikTokText(text);
    if (sounds !== null) {
      recognized = true;
      if (sounds.length) return deduplicate(sounds);
    }
  }
  if (recognized) throw new TikTokArchiveError("NO_FAVORITES", "No favorite sounds were found in this TikTok archive.");
  throw new TikTokArchiveError("FORMAT_UNRECOGNIZED", "We found export files, but could not locate the Favorite Sounds section. TikTok may have changed its export format.");
}

function deduplicate(sounds: TikTokFavoriteSound[]): TikTokFavoriteSound[] {
  return [...new Map(sounds.map((sound) => [sound.soundUrl, sound])).values()];
}
