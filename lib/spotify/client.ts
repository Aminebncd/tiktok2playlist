import type { SpotifyTrack } from "@/types";

export class SpotifyApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: string) { super(message); }
}

export async function spotifyFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new SpotifyApiError(response.status, response.status === 429 ? "Spotify is busy. Please wait a moment and try again." : "Spotify could not complete that request.", response.headers.get("retry-after") ?? undefined);
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

interface SpotifySearchResponse { tracks: { items: Array<{ id: string; uri: string; name: string; artists: Array<{ name: string }>; album: { name: string; images: Array<{ url: string }> }; external_urls: { spotify: string } }> } }

export async function searchTrack(query: string, token: string): Promise<SpotifyTrack | null> {
  const result = await spotifyFetch<SpotifySearchResponse>(`/search?type=track&limit=1&q=${encodeURIComponent(query)}`, token);
  const track = result.tracks.items[0];
  return track ? { id: track.id, uri: track.uri, title: track.name, artists: track.artists.map((artist) => artist.name).join(", "), album: track.album.name, imageUrl: track.album.images[1]?.url ?? track.album.images[0]?.url, externalUrl: track.external_urls.spotify } : null;
}
