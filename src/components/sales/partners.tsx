import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createSalesPartner } from "@/lib/sales-partners.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Création de comptes partenaires — affichée uniquement sur tablette et ordinateur. */
export function PartnerAccounts({ wsId, onDone }: { wsId: string; onDone: () => void }) {
  const create = useServerFn(createSalesPartner);
  const [f, setF] = useState({ firstName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password.length < 8) { toast.error("Mot de passe : 8 caractères minimum."); return; }
    setBusy(true);
    try {
      const r = await create({ data: { workspaceId: wsId, ...f } });
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.existed ? `${f.email} avait déjà un compte : ajouté à l'espace.` : `Compte de ${f.firstName} créé. Transmets-lui l'email et le mot de passe.`);
      setF({ firstName: "", email: "", password: "" });
      onDone();
    } catch {
      toast.error("Création impossible, réessaie.");
    } finally { setBusy(false); }
  }

  return (
    <section className="sales-card hidden md:block" aria-label="Comptes partenaires">
      <h2 className="sales-h2 flex items-center gap-2"><UserPlus className="size-4" />Créer un compte partenaire</h2>
      <p className="mt-1 text-sm text-muted-foreground">Le partenaire se connecte sur /sales/auth et reste connecté. Aximus l'appellera par son prénom.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5"><Label htmlFor="p-first">Prénom</Label><Input id="p-first" required maxLength={40} value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="p-email">Email</Label><Input id="p-email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="p-pass">Mot de passe provisoire</Label><Input id="p-pass" type="text" required minLength={8} autoComplete="off" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <Button type="submit" className="md:col-span-3" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : "Créer le compte"}</Button>
      </form>
    </section>
  );
}
