import { afterEach, describe, expect, it, vi } from "vitest";
import { searchTrack, SpotifyApiError } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("Spotify client", () => {
  it("maps Spotify search data to the small client model", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ tracks: { items: [{ id: "abc", uri: "spotify:track:abc", name: "Hello", artists: [{ name: "Adele" }], album: { name: "25", images: [{ url: "cover" }] }, external_urls: { spotify: "https://open.spotify.com/track/abc" } }] } }), { status: 200 })));
    await expect(searchTrack("Hello Adele", "token")).resolves.toMatchObject({ title: "Hello", artists: "Adele", album: "25" });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("q=Hello%20Adele"), expect.objectContaining({ cache: "no-store" }));
  });
  it("surfaces rate limits as a useful typed error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "5" } })));
    await expect(searchTrack("query", "token")).rejects.toMatchObject({ status: 429, retryAfter: "5" } satisfies Partial<SpotifyApiError>);
  });
});
