import { describe, expect, it } from "vitest";
import { COACH_GROUPS, QUICK_COACH, coachGroupForSlug, dailyCallCounts, dailyPerformanceSeries, delta, findDuplicates, mergePlaybook, parseCsv, periodStats, PRICING, qualityBadges, ratioPercent, DEFAULT_PLAYBOOK } from "@/lib/sales";

describe("sales rules", () => {
  it("grille SHOP correspond aux arbitrages DG et évite le cumul de commissions", () => {
    expect(PRICING.offers.map((offer) => offer.price)).toEqual(["59 €/mois", "59 €/mois", "0 €/mois + 8 %", "39 €/mois + 4 %"]);
    expect(PRICING.delivered).toContain("1 € + 11 %");
    expect(PRICING.delivered).toContain("REMPLACEMENT");
    expect(PRICING.caution).toContain("HT/TTC");
  });
  it("détecte un doublon par nom (accents/casse) ou téléphone", () => {
    const list = [{ id: "1", name: "Le Bistrot Été", phone: "+33 6 12 34 56 78" }];
    expect(findDuplicates(list, "le bistrot ete", null)).toHaveLength(1);
    expect(findDuplicates(list, "Autre", "06.12.34.56.78")).toHaveLength(1);
    expect(findDuplicates(list, "Autre", "0700000000")).toHaveLength(0);
  });
  it("parse un CSV ; avec en-têtes FR et ignore priorités invalides", () => {
    const r = parseCsv("Nom;Téléphone;Ville;Priorité\nChez Ali;0611;Lyon;p1\nSans;;;P9");
    expect(r[0]).toMatchObject({ name: "Chez Ali", phone: "0611", city: "Lyon", priority: "P1" });
    expect(r[1]?.priority).toBeUndefined();
  });
  it("compte le rythme sur sept jours sans reprendre les appels plus anciens", () => {
    const end = new Date(2026, 10, 24, 12);
    const days = dailyCallCounts([
      { created_at: new Date(2026, 10, 24, 9).toISOString() },
      { created_at: new Date(2026, 10, 24, 18).toISOString() },
      { created_at: new Date(2026, 10, 23, 10).toISOString() },
      { created_at: new Date(2026, 10, 18, 10).toISOString() },
      { created_at: new Date(2026, 10, 17, 23, 59).toISOString() },
    ], end);
    expect(days).toHaveLength(7);
    expect(days.map((day) => day.count)).toEqual([1, 0, 0, 0, 0, 1, 2]);
  });
  it("sépare appels et conversations utiles dans le graphique quotidien", () => {
    const end = new Date(2026, 10, 24, 12);
    const days = dailyPerformanceSeries([
      { created_at: new Date(2026, 10, 24, 9).toISOString(), outcome: "repondu" },
      { created_at: new Date(2026, 10, 24, 10).toISOString(), outcome: "pas_repondu" },
      { created_at: new Date(2026, 10, 23, 10).toISOString(), outcome: "r2" },
    ], end);
    expect(days.at(-1)).toMatchObject({ calls: 2, useful: 1 });
    expect(days.at(-2)).toMatchObject({ calls: 1, useful: 1 });
  });
  it("n'invente pas de taux sans dénominateur", () => {
    expect(ratioPercent(0, 0)).toBeNull();
    expect(ratioPercent(3, 8)).toBe(38);
  });
  it("pas de variation affichée sans assez de données", () => {
    expect(delta(10, 4)).toBeNull();
    expect(delta(15, 10)).toBe(50);
  });
  it("badges seulement depuis les données", () => {
    const empty = periodStats([], [], new Date(0), new Date());
    expect(qualityBadges(empty)).toEqual([]);
  });
  it("reprend les intentions et les formulations du playbook validé", () => {
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "ouverture-fleuriste")?.title).toContain("Fleuriste");
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "interflora")?.next_question).toContain("directement");
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "r2")?.advice).toContain("rendez-vous pris");
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "rappelle-plus-tard")?.advice).toContain("rendez-vous commercial");
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "verite")?.advice).toContain("réservation sans paiement");
    expect(DEFAULT_PLAYBOOK.some((c) => /restaurateur|25 restaurants|Uber Eats|199 € de mise/i.test([c.title,c.advice,c.goal,c.next_question,c.listen].join(" ")))).toBe(false);
    expect(new Set(DEFAULT_PLAYBOOK.map((c) => c.slug)).size).toBe(DEFAULT_PLAYBOOK.length);
  });
  it("classe toutes les fiches et relie les six réponses rapides", () => {
    expect(COACH_GROUPS).toHaveLength(7);
    expect(DEFAULT_PLAYBOOK.every((c) => coachGroupForSlug(c.slug) !== "autres")).toBe(true);
    expect(QUICK_COACH).toHaveLength(6);
    expect(QUICK_COACH.every((q) => DEFAULT_PLAYBOOK.some((c) => c.slug === q.slug))).toBe(true);
    expect(coachGroupForSlug("nouvelle-fiche-equipe")).toBe("autres");
  });
  it("applique les modifications d'équipe aussi aux raccourcis d'appel", () => {
    const original = DEFAULT_PLAYBOOK.find((c) => c.slug === "interflora")!;
    const customized = { ...original, id: "surcouche", next_question: "Notre question d'équipe" };
    const result = mergePlaybook([customized]);
    expect(result.find((c) => c.slug === "interflora")?.next_question).toBe("Notre question d'équipe");
    expect(QUICK_COACH.some((q) => q.slug === customized.slug)).toBe(true);
  });
  it("les anciennes cartes FOOD ne reviennent jamais via les données d'équipe", () => {
    const result = mergePlaybook([{slug:"uber-eats", title:"Uber Eats", advice:"Ancien script", position:5, goal:null, listen:null, next_question:null}]);
    expect(result.some((c) => c.slug === "uber-eats")).toBe(false);
  });
  it("la carte d'équipe remplace la carte de base", () => {
    const base = DEFAULT_PLAYBOOK.find((card) => card.slug === "cest-cher")!;
    const m = mergePlaybook([{ ...base, advice: "X", id: "a" }]);
    expect(m).toHaveLength(DEFAULT_PLAYBOOK.length);
    expect(m.find((c) => c.slug === "cest-cher")?.advice).toBe("X");
  });
});
