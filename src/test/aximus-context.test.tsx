import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Aximus } from "@/components/sales/aximus";

const mocks = vi.hoisted(() => ({ start: vi.fn() }));
let voiceOptions: { startData?: () => Record<string, string> } | undefined;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "test-session" } } }) } },
}));

vi.mock("@/hooks/use-live-voice", () => ({
  useLiveVoice: (options: { startData?: () => Record<string, string> }) => {
    voiceOptions = options;
    return {
      status: "idle", error: null, muted: false, playbackBlocked: false,
      audioRef: { current: null }, start: mocks.start, stop: vi.fn(), setMuted: vi.fn(), resumePlayback: vi.fn(),
    };
  },
}));

describe("Aximus contextual Performance debrief", () => {
  beforeEach(() => { voiceOptions = undefined; mocks.start.mockReset(); });

  it("transmet uniquement le contexte visible, borné, avec l’espace Sales", async () => {
    const context = `Source : onglet Performance de BIIZ Sales.\nSemaine en cours : 3 appels. ${"x".repeat(1700)}`;
    render(<Aximus wsId="workspace-sales" context={context} compact />);
    fireEvent.click(screen.getByRole("button", { name: "Lancer le débrief" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
    const payload = voiceOptions?.startData?.();
    expect(payload?.["workspaceId"]).toBe("workspace-sales");
    expect(payload?.["context"]).toContain("Semaine en cours : 3 appels.");
    expect(payload?.["context"]).toHaveLength(1600);
    expect(payload?.["token"]).toBe("test-session");
  });
});
