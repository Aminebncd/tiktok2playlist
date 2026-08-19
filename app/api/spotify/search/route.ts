import { NextRequest, NextResponse } from "next/server";
import { queryForSound } from "@/lib/matching";
import { getAccessToken } from "@/lib/spotify/auth";
import { searchTrack, SpotifyApiError } from "@/lib/spotify/client";
import type { TikTokFavoriteSound, TrackMatch } from "@/types";

function validSound(value: unknown): value is TikTokFavoriteSound {
  if (typeof value !== "object" || value === null) return false;
  const sound = value as Record<string, unknown>;
  return typeof sound.id === "string" && typeof sound.soundUrl === "string" && sound.soundUrl.length < 2048 && (sound.displayName === undefined || typeof sound.displayName === "string");
}

export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Connect Spotify to search for tracks." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const sounds = (body as { sounds?: unknown })?.sounds;
  if (!Array.isArray(sounds) || sounds.length > 500 || !sounds.every(validSound)) return NextResponse.json({ error: "Provide up to 500 valid sounds." }, { status: 400 });
  try {
    const matches: TrackMatch[] = [];
    for (const sound of sounds) {
      const query = queryForSound(sound);
      const track = query ? await searchTrack(query, token) : null;
      matches.push({ sound, status: track ? "matched" : "unmatched", ...(track ? { track } : {}), selected: Boolean(track) });
    }
    return NextResponse.json({ matches });
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Spotify search failed." }, { status, headers: error instanceof SpotifyApiError && error.retryAfter ? { "Retry-After": error.retryAfter } : undefined });
  }
}
