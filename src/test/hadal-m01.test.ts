import { describe, expect, it } from "vitest";
import { m01Measure } from "@/lib/hadal-m01";

const contents = [{ id: "c1", campaign_id: "k1" }, { id: "c2", campaign_id: "k1" }];
const links = [{ id: "l1", campaign_id: "k1" }];
const dists = [{ id: "d1", content_id: "c1", link_id: "l1", channel: "story", reach: null, shares: null }];
const off = { sessionsTracked: false, ordersTracked: false, customersTracked: false };

describe("Mesure M01", () => {
  it("affiche vide (null) quand aucune donnée n'est mesurée, jamais 0", () => {
    const r = m01Measure({ contents, links, dists, clicks: [], events: [], flags: off }).get("c1")!;
    expect(r.reach).toBeNull();
    expect(r.sessions).toBeNull();
    expect(r.orders).toBeNull();
    expect(r.revenue).toBeNull();
    expect(r.ordersPerSession).toBeNull();
    expect(r.newCustomers).toBeNull();
  });

  it("zéro clic observé sur un lien existant reste 0 ; un contenu sans lien reste vide", () => {
    const m = m01Measure({ contents, links, dists, clicks: [], events: [], flags: off });
    expect(m.get("c1")!.clicks).toBe(0);
    expect(m.get("c2")!.clicks).toBeNull();
  });

  it("une commande ne compte qu'une fois, tests exclus, remboursement déduit, même session exigée", () => {
    const events = [
      { link_id: "l1", session_id: "s1", name: "page_view", props: null, created_at: "1" },
      { link_id: "l1", session_id: "s1", name: "purchase", props: { order_id: "A", revenue: 20, refund: 5, customer_type: "new" }, created_at: "2" },
      { link_id: "l1", session_id: "s1", name: "purchase", props: { order_id: "A", revenue: 20 }, created_at: "3" },
      { link_id: "l1", session_id: "s1", name: "purchase", props: { order_id: "T", revenue: 99, test: true }, created_at: "4" },
      { link_id: "l1", session_id: "s9", name: "purchase", props: { order_id: "B", revenue: 50 }, created_at: "5" },
    ];
    const r = m01Measure({ contents, links, dists, clicks: [{ link_id: "l1" }], events, flags: { sessionsTracked: true, ordersTracked: true, customersTracked: true } }).get("c1")!;
    expect(r.orders).toBe(1);
    expect(r.revenue).toBe(15);
    expect(r.sessions).toBe(2);
    expect(r.ordersPerSession).toBe(0.5);
    expect(r.newCustomers).toBe(1);
    expect(r.returningCustomers).toBe(0);
  });

  it("portée et partages viennent des diffusions saisies", () => {
    const d = [{ ...dists[0]!, reach: 300, shares: 0 }, { id: "d2", content_id: "c1", channel: "instagram", reach: 200, shares: null }];
    const r = m01Measure({ contents, links, dists: d, clicks: [], events: [], flags: off }).get("c1")!;
    expect(r.reach).toBe(500);
    expect(r.shares).toBe(0);
  });
});
