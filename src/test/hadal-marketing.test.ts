import { describe, expect, it } from "vitest";
import { cadenceFromSettings, editorialCadence, instagramCanonical, instagramEmbedUrl, parsePlans, weekKey, monthKey } from "@/lib/hadal-marketing";

describe("HADAL editorial rules", () => {
  it.each([
    ["static_commercial", 1, "week"],
    ["static_lifestyle", 1, "week"],
    ["video_simple", 1, "week"],
    ["stories", 2, "day"],
  ])("sets the M01 cadence for %s", (id, count, period) => {
    const item = editorialCadence.find((entry) => entry.id === id);
    expect(item?.count).toBe(count);
    expect(item?.period).toBe(period);
  });

  it("reads a workspace-specific cadence without hardcoding it in the UI", () => {
    const cadence = cadenceFromSettings({
      static_commercial_per_week: 2,
      static_lifestyle_per_week: 1,
      simple_video_per_week: 2,
      stories_per_day_min: 1,
      stories_per_day_max: 4,
    });
    expect(cadence.find((x) => x.id === "static_commercial")?.count).toBe(2);
    expect(cadence.find((x) => x.id === "video_simple")?.count).toBe(2);
    expect(cadence.find((x) => x.id === "stories")?.rhythm).toBe("1–4 / jour");
  });

  it("groups missions by Monday week and first day of month", () => {
    expect(weekKey(new Date(2026, 9, 9))).toBe("2026-10-05");
    expect(monthKey(new Date(2026, 9, 9))).toBe("2026-10-01");
  });

  it("ignores malformed plans", () => {
    expect(parsePlans([{ title: "A", instruction: "B" }, 3, { foo: 1 }])).toEqual([{ title: "A", instruction: "B", line: undefined }]);
  });

  it("uses an official embed endpoint for a valid permalink", () => {
    expect(instagramEmbedUrl("https://www.instagram.com/reel/AbC_123-/?igsh=example")).toBe("https://www.instagram.com/reel/AbC_123-/embed/");
    expect(instagramCanonical("https://instagram.com/p/AbC123")).toBe("https://www.instagram.com/p/AbC123/");
  });

  it.each(["https://instagram.com.attacker.test/reel/abc/", "javascript:alert(1)", "https://www.instagram.com/accounts/login/", "http://instagram.com/p/abc/"])("rejects unsafe or non-post URLs: %s", (url) => {
    expect(instagramEmbedUrl(url)).toBeNull();
  });
});
