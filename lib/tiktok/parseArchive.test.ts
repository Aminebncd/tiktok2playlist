import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseTikTokArchive, parseTikTokJson, parseTikTokText, TikTokArchiveError } from "./parseArchive";

async function archive(name: string, contents: string) {
  const zip = new JSZip(); zip.file(name, contents); return zip.generateAsync({ type: "arraybuffer" });
}

describe("TikTok archive parser", () => {
  it("recognizes a JSON export and extracts favorite sounds", async () => {
    const input = await archive("TikTok/Activity/Favorite Sounds.json", JSON.stringify({ Activity: { "Favorite Sounds": { "Favorite Sound List": [{ Date: "2025-01-02 12:00:00", Link: "https://www.tiktok.com/music/a-song-1234567890", "Sound Name": "A Song - An Artist" }] } } }));
    await expect(parseTikTokArchive(input)).resolves.toMatchObject([{ date: "2025-01-02 12:00:00", soundUrl: "https://www.tiktok.com/music/a-song-1234567890", displayName: "A Song - An Artist" }]);
  });

  it("extracts the text export format", () => {
    expect(parseTikTokText("Favorite Sounds\n\nDate: 2024-02-01\nLink: https://tiktok.com/music/hello-1234567890\nName: Hello - Adele")).toMatchObject([{ displayName: "Hello - Adele" }]);
  });

  it("reports an empty recognized favorites list", async () => {
    const input = await archive("user_data.json", JSON.stringify({ Activity: { "Favorite Sounds": { "Favorite Sound List": [] } } }));
    await expect(parseTikTokArchive(input)).rejects.toMatchObject({ code: "NO_FAVORITES" });
  });

  it("ignores malformed entries rather than fabricating metadata", () => {
    expect(parseTikTokJson(JSON.stringify({ "Favorite Sounds": [{ Date: "today" }, null, "bad"] }))).toEqual([]);
  });

  it("reports missing expected sections and invalid ZIPs", async () => {
    await expect(parseTikTokArchive(await archive("profile.json", "{}"))).rejects.toMatchObject({ code: "FORMAT_UNRECOGNIZED" });
    await expect(parseTikTokArchive(new TextEncoder().encode("not a zip").buffer)).rejects.toBeInstanceOf(TikTokArchiveError);
  });
});
