import { describe, expect, it } from "vitest";
import { editorialCadence, instagramEmbedUrl, instagramInspirations } from "@/lib/hadal-marketing";

describe("HADAL editorial rules", () => {
  it.each([
    ["pov", 2, "week"],
    ["static", 1, "week"],
    ["signature", 1, "month"],
    ["operation", 1, "month"],
  ])("sets the required cadence for %s", (id, count, period) => {
    const item = editorialCadence.find((entry) => entry.id === id);
    expect(item?.count).toBe(count);
    expect(item?.period).toBe(period);
  });

  it("does not invent Instagram references before real links are supplied", () => {
    expect(instagramInspirations).toEqual([]);
  });

  it("uses an official embed endpoint for a valid permalink", () => {
    expect(instagramEmbedUrl("https://www.instagram.com/reel/AbC_123-/?igsh=example")).toBe("https://www.instagram.com/reel/AbC_123-/embed/");
    expect(instagramEmbedUrl("https://instagram.com/p/AbC123/")).toBe("https://www.instagram.com/p/AbC123/embed/");
  });

  it.each(["https://instagram.com.attacker.test/reel/abc/", "javascript:alert(1)", "https://www.instagram.com/accounts/login/", "http://instagram.com/p/abc/"])("rejects unsafe or non-post URLs: %s", (url) => {
    expect(instagramEmbedUrl(url)).toBeNull();
  });
});