import type { TikTokFavoriteSound } from "@/types";

export function normalizeSoundName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^original sound\s*[-–—:]?\s*/i, "")
    .replace(/\s*\|\s*tiktok$/i, "")
    .trim();
}

export function queryForSound(sound: TikTokFavoriteSound): string | null {
  if (sound.displayName) {
    const normalized = normalizeSoundName(sound.displayName);
    return normalized.length >= 2 ? normalized : null;
  }
  try {
    const slug = new URL(sound.soundUrl).pathname.split("/").filter(Boolean).at(-1);
    if (!slug) return null;
    const withoutId = decodeURIComponent(slug).replace(/-\d{8,}$/, "").replace(/[-_]+/g, " ");
    const normalized = normalizeSoundName(withoutId);
    return normalized.length >= 2 && !/^sound$/i.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}
