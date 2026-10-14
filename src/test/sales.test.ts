import { describe, expect, it } from "vitest";
import { COACH_GROUPS, QUICK_COACH, coachGroupForSlug, delta, findDuplicates, mergePlaybook, parseCsv, periodStats, PRICING, qualityBadges, DEFAULT_PLAYBOOK } from "@/lib/sales";

describe("sales rules", () => {
  it("tarifs Widget véridiques", () => {
    expect([PRICING.widget.setup, PRICING.widget.monthly, PRICING.widget.perDelivery]).toEqual([199, 149, 0.48]);
  });
  it("tarifs App véridiques", () => {
    expect([PRICING.app.setup, PRICING.app.monthly, PRICING.app.perDelivery]).toEqual([850, 108, 0.29]);
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
  it("pas de variation affichée sans assez de données", () => {
    expect(delta(10, 4)).toBeNull();
    expect(delta(15, 10)).toBe(50);
  });
  it("badges seulement depuis les données", () => {
    const empty = periodStats([], [], new Date(0), new Date());
    expect(qualityBadges(empty)).toEqual([]);
  });
  it("reprend les intentions et les formulations du playbook validé", () => {
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "ouverture")?.advice).toContain("responsable commercial");
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "uber-eats")?.next_question).toContain("directement chez vous");
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "r2")?.advice).toContain("MANUELLEMENT");
    expect(DEFAULT_PLAYBOOK.find((c) => c.slug === "rappelle-plus-tard")?.advice).toContain("n'est pas un R2");
    expect(new Set(DEFAULT_PLAYBOOK.map((c) => c.slug)).size).toBe(DEFAULT_PLAYBOOK.length);
  });
  it("classe toutes les fiches et relie les six réponses rapides", () => {
    expect(COACH_GROUPS).toHaveLength(6);
    expect(DEFAULT_PLAYBOOK.every((c) => coachGroupForSlug(c.slug) !== "autres")).toBe(true);
    expect(QUICK_COACH).toHaveLength(6);
    expect(QUICK_COACH.every((q) => DEFAULT_PLAYBOOK.some((c) => c.slug === q.slug))).toBe(true);
    expect(coachGroupForSlug("nouvelle-fiche-equipe")).toBe("autres");
  });
  it("applique les modifications d'équipe aussi aux raccourcis d'appel", () => {
    const original = DEFAULT_PLAYBOOK.find((c) => c.slug === "uber-eats")!;
    const customized = { ...original, id: "surcouche", next_question: "Notre question d'équipe" };
    const result = mergePlaybook([customized]);
    expect(result.find((c) => c.slug === "uber-eats")?.next_question).toBe("Notre question d'équipe");
    expect(QUICK_COACH.some((q) => q.slug === customized.slug)).toBe(true);
  });
  it("la carte d'équipe remplace la carte de base", () => {
    const m = mergePlaybook([{ ...DEFAULT_PLAYBOOK[6]!, advice: "X", id: "a" }]);
    expect(m).toHaveLength(DEFAULT_PLAYBOOK.length);
    expect(m.find((c) => c.slug === "cest-cher")?.advice).toBe("X");
  });
});
