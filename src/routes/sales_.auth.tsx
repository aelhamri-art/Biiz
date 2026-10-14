import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BiizSalesLogo } from "@/components/sales/BiizBee";
import { BiizFooter } from "@/components/biiz-footer";

export const Route = createFileRoute("/sales_/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — BIIZ Sales Forces" },
      { name: "description", content: "Connexion des partenaires commerciaux BIIZ Sales." },
      { property: "og:title", content: "Connexion — BIIZ Sales Forces" },
      { property: "og:description", content: "Connexion des partenaires commerciaux BIIZ Sales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SalesAuth,
});

function SalesAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/sales" }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/sales" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Email ou mot de passe incorrect.");
  }

  return (
    <div className="biiz-sales flex min-h-screen flex-col bg-background px-6">
      <div className="sales-stripes -mx-6 h-1.5" aria-hidden />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
        <BiizSalesLogo size={40} />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Connexion partenaire</h1>
        <p className="mt-2 text-sm text-muted-foreground">Une seule connexion : vous restez connecté sur cet appareil.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="s-email">Email</Label><Input id="s-email" className="h-12" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="s-pass">Mot de passe</Label><Input id="s-pass" className="h-12" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <>Se connecter<ArrowRight /></>}</Button>
        </form>
        <p className="mt-6 text-xs text-muted-foreground">Pas de compte ? Demandez à votre responsable de vous en créer un depuis BIIZ Sales.</p>
      </main>
      <BiizFooter />
    </div>
  );
}
