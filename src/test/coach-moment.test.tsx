import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CoachMoment } from "@/components/sales/coach-moment";
import { DEFAULT_PLAYBOOK, mergePlaybook } from "@/lib/sales";

afterEach(cleanup);

function teamCard() {
  const original = DEFAULT_PLAYBOOK.find((card) => card.slug === "uber-eats");
  if (!original) throw new Error("Missing baseline card");
  const card = mergePlaybook([{ ...original, goal: "Comprendre le canal direct", next_question: "Comment commande-t-on chez vous ?", listen: "Le canal réellement utilisé" }]).find((item) => item.slug === "uber-eats");
  if (!card) throw new Error("Missing merged card");
  return card;
}

describe("coaching terrain", () => {
  it("avance de l’intention à la question puis à l’écoute, avec les valeurs d’équipe", () => {
    render(<CoachMoment card={teamCard()} />);
    expect(screen.getByRole("region").textContent).toContain("Comprendre le canal direct");
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("region").textContent).toContain("Comment commande-t-on chez vous ?");
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("region").textContent).toContain("Le canal réellement utilisé");
    fireEvent.click(screen.getByRole("button", { name: "Reprendre" }));
    expect(screen.getByRole("button", { name: "Comprendre" })).toHaveAttribute("aria-pressed", "true");
  });
  it("affiche directement la question en appel sans exercice", () => {
    render(<CoachMoment card={teamCard()} live />);
    expect(screen.getByRole("region").textContent).toContain("Comment commande-t-on chez vous ?");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Écouter" }));
    expect(screen.getByRole("region").textContent).toContain("Le canal réellement utilisé");
  });
  it("permet une reformulation personnelle sans modifier la carte", () => {
    const card = teamCard();
    render(<CoachMoment card={card} />);
    fireEvent.click(screen.getByRole("button", { name: "Avec mes mots" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Et en direct, ça se passe comment ?" } });
    fireEvent.click(screen.getByRole("button", { name: "Puis, j’écoute" }));
    expect(screen.getByRole("button", { name: "Écouter" })).toHaveAttribute("aria-pressed", "true");
    expect(card.next_question).toBe("Comment commande-t-on chez vous ?");
  });
});