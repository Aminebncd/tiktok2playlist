import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify/auth";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";

const URI = /^spotify:track:[A-Za-z0-9]{10,30}$/;

export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Your Spotify session expired. Please reconnect." }, { status: 401 });
  let body: { name?: unknown; uris?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const uris = body.uris;
  if (!name || name.length > 100 || !Array.isArray(uris) || !uris.length || uris.length > 500 || !uris.every((uri) => typeof uri === "string" && URI.test(uri))) return NextResponse.json({ error: "Choose a playlist name and at least one valid track." }, { status: 400 });
  try {
    const me = await spotifyFetch<{ id: string }>("/me", token);
    const playlist = await spotifyFetch<{ id: string; external_urls: { spotify: string } }>(`/users/${encodeURIComponent(me.id)}/playlists`, token, { method: "POST", body: JSON.stringify({ name, public: false, description: "Created from TikTok saved sounds with Soundsift" }) });
    let added = 0;
    let addError: string | undefined;
    for (let index = 0; index < uris.length; index += 100) {
      const batch = uris.slice(index, index + 100);
      try { await spotifyFetch(`/playlists/${playlist.id}/items`, token, { method: "POST", body: JSON.stringify({ uris: batch }) }); added += batch.length; }
      catch { addError = `Playlist created, but only ${added} of ${uris.length} tracks were added.`; break; }
    }
    return NextResponse.json({ name, added, total: uris.length, url: playlist.external_urls.spotify, partial: added !== uris.length, ...(addError ? { warning: addError } : {}) });
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Playlist creation failed." }, { status });
  }
}
