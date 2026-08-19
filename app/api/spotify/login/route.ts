import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { spotifyConfig, SPOTIFY_SCOPES } from "@/lib/spotify/auth";

export async function GET() {
  try {
    const { clientId, redirectUri } = spotifyConfig();
    const state = randomBytes(24).toString("hex");
    (await cookies()).set("spotify_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
    const params = new URLSearchParams({ client_id: clientId, response_type: "code", redirect_uri: redirectUri, state, scope: SPOTIFY_SCOPES, show_dialog: "false" });
    return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
  } catch { return NextResponse.redirect(new URL("/?spotify=configuration_error", process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000")); }
}
