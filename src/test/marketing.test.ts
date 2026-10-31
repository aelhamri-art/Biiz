import { describe, expect, it } from "vitest";
import { adMetrics, aggregate, eventRevenue, parseCadence, parseCalendarCsv, HADAL_M01_CADENCE } from "@/lib/marketing";

describe("marketing V1.1", () => {
  it("calcule CPA et ROAS", () => {
    const m = adMetrics({ spend: 100, impressions: 10000, clicks: 200, conversions: 4, revenue: 300 });
    expect(m.cpa).toBe(25);
    expect(m.roas).toBe(3);
    expect(m.cpc).toBe(0.5);
    expect(m.ctr).toBe(2);
  });
  it("aucun CPA/ROAS sans conversion ni dépense", () => {
    const m = adMetrics({ spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
    expect([m.cpa, m.roas, m.ctr, m.cpc]).toEqual([null, null, null, null]);
  });
  it("lit le montant d'un purchase", () => {
    expect(eventRevenue({ revenue: 24.5 })).toBe(24.5);
    expect(eventRevenue({ value: "12,90" })).toBe(12.9);
    expect(eventRevenue(null)).toBe(0);
  });
  it("un purchase sur le lien d'une diffusion remonte au contenu et à la campagne", () => {
    const r = aggregate({
      links: [{ id: "L1" }], contents: [{ id: "C1", campaign_id: "K1" }],
      dists: [{ id: "D1", content_id: "C1", link_id: "L1", channel: "instagram" }],
      clicks: [{ link_id: "L1" }, { link_id: "L1" }],
      events: [{ link_id: "L1", name: "purchase", props: { revenue: 40 } }, { link_id: "L1", name: "page_view", props: null }],
      ads: [],
    });
    expect(r.byCampaign.get("K1")).toMatchObject({ revenue: 40, conversions: 1, clicks: 2 });
    expect(r.byContent.get("C1")?.revenue).toBe(40);
    expect(r.byChannel.get("instagram")?.revenue).toBe(40);
  });
  it("le même contenu en organique et en Meta Ads, comparé par canal", () => {
    const r = aggregate({
      links: [], contents: [{ id: "C1", campaign_id: "K1" }],
      dists: [{ id: "D1", content_id: "C1", channel: "instagram", reach: 500 }, { id: "D2", content_id: "C1", channel: "meta_ads" }],
      clicks: [], events: [],
      ads: [{ campaign_id: null, content_id: null, distribution_id: "D2", platform: "meta", spend: 50, impressions: 4000, reach: 3000, clicks: 80, conversions: 2, revenue: 120 }],
    });
    expect(r.byContent.get("C1")).toMatchObject({ spend: 50, revenue: 120 });
    expect(r.byCampaign.get("K1")?.spend).toBe(50);
    expect(r.byChannel.get("meta_ads")?.spend).toBe(50);
    expect(r.byChannel.get("instagram")?.reach).toBe(500);
  });
  it("importe le calendrier CSV avec les en-têtes FR", () => {
    const rows = parseCalendarCsv('Semaine;Format;Concept;Intention business;Cible;Légende;Asset/visuel;Statut\nS1;Statique;Révolution à La Teste;Téléchargements app;Locaux 18-35;"On arrive; enfin";visuel.png;À valider');
    expect(rows[0]).toMatchObject({ week: "S1", format: "statique", title: "Révolution à La Teste", caption: "On arrive; enfin", status: "a_valider" });
  });
  it("cadence M01 : 2 statiques + 1 vidéo par semaine, 3 stories par jour", () => {
    expect(HADAL_M01_CADENCE.filter((c) => c.period === "semaine").reduce((s, c) => s + c.count, 0)).toBe(3);
    expect(HADAL_M01_CADENCE.find((c) => c.period === "jour")?.count).toBe(3);
    expect(parseCadence([{ label: "x", count: 1, period: "an" }])).toEqual([]);
  });
});
