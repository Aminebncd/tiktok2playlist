import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { setSpotifyTokens, spotifyConfig } from "@/lib/spotify/auth";

export async function GET(request: NextRequest) {
  const base = new URL("/", request.url);
  const error = request.nextUrl.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL("/?spotify=denied", base));
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("spotify_oauth_state")?.value;
  store.delete("spotify_oauth_state");
  if (!code || !state || state !== expectedState) return NextResponse.redirect(new URL("/?spotify=invalid_state", base));
  try {
    const { clientId, clientSecret, redirectUri } = spotifyConfig();
    const response = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }), cache: "no-store" });
    if (!response.ok) throw new Error("Token exchange failed");
    const token = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
    await setSpotifyTokens(token.access_token, token.expires_in, token.refresh_token);
    return NextResponse.redirect(new URL("/?spotify=connected", base));
  } catch { return NextResponse.redirect(new URL("/?spotify=auth_error", base)); }
}
