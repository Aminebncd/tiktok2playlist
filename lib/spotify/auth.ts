import { cookies } from "next/headers";

export const SPOTIFY_SCOPES = "playlist-modify-private";
const TOKEN_COOKIE = "spotify_access_token";
const REFRESH_COOKIE = "spotify_refresh_token";

function config() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Spotify environment variables are not configured.");
  return { clientId, clientSecret, redirectUri };
}

export function spotifyConfig() { return config(); }

export async function setSpotifyTokens(accessToken: string, expiresIn: number, refreshToken?: string) {
  const store = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  store.set(TOKEN_COOKIE, accessToken, { ...options, maxAge: expiresIn });
  if (refreshToken) store.set(REFRESH_COOKIE, refreshToken, { ...options, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSpotifyTokens() {
  const store = await cookies();
  store.delete(TOKEN_COOKIE); store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  const current = store.get(TOKEN_COOKIE)?.value;
  if (current) return current;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const { clientId, clientSecret } = config();
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) { await clearSpotifyTokens(); return null; }
  const token = await response.json() as { access_token: string; expires_in: number; refresh_token?: string };
  await setSpotifyTokens(token.access_token, token.expires_in, token.refresh_token);
  return token.access_token;
}
