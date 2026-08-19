import { describe, expect, it } from "vitest";
import { normalizeSoundName, queryForSound } from "./matching";

describe("sound query helpers", () => {
  it("normalizes obvious TikTok noise without stripping versions", () => {
    expect(normalizeSoundName("  original sound —  Espresso (sped up)  | TikTok ")).toBe("Espresso (sped up)");
  });
  it("uses an explicit display name first", () => {
    expect(queryForSound({ id: "1", soundUrl: "https://tiktok.com/music/x", displayName: "  Birds of a Feather - Billie Eilish " })).toBe("Birds of a Feather - Billie Eilish");
  });
  it("derives a conservative query from a TikTok music slug", () => {
    expect(queryForSound({ id: "1", soundUrl: "https://www.tiktok.com/music/good-luck-babe-7399999999999999999" })).toBe("good luck babe");
  });
  it("does not invent a query from an unusable URL", () => expect(queryForSound({ id: "1", soundUrl: "invalid" })).toBeNull());
});
