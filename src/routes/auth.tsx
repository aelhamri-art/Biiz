import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BiizFooter } from "@/components/biiz-footer";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — BIIZ" },
      { name: "description", content: "Connectez-vous à BIIZ." },
      { property: "og:title", content: "Connexion — BIIZ" },
      { property: "og:description", content: "Connectez-vous à BIIZ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const go = () => {
      let next: string | null = null;
      try { next = sessionStorage.getItem("biiz:next"); sessionStorage.removeItem("biiz:next"); } catch { /* ignore */ }
      if (next === "/hadal-marketing") navigate({ to: "/hadal-marketing" });
      else navigate({ to: "/app" });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) go();
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/app` } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up") toast.success("Vérifiez votre email pour confirmer votre compte.");
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Connexion Google impossible");
  }

  return (
    <div className="biiz-auth flex min-h-screen flex-col px-6">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between py-6"><Link to="/" className="flex items-center gap-3"><span className="biiz-mark">B</span><span className="text-lg font-semibold">BIIZ</span></Link><Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft />Retour</Link></Button></header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-24 pt-12">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">BIIZ · AXIUM</p>
        <Button variant="outline" className="mt-8 w-full" onClick={google}><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.3c1.9-1.8 2.9-4.4 2.9-7.7ZM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.7c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3v2.8A10 10 0 0 0 12 22ZM6.4 13.6a6 6 0 0 1 0-3.2V7.6H3a10 10 0 0 0 0 8.8l3.4-2.8ZM12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.6l3.4 2.8C7.2 8 9.4 6.2 12 6.2Z" /></svg>Continuer avec Google</Button>
        <div className="biiz-auth-separator my-6 text-center text-xs text-muted-foreground">ou</div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="auth-email">Email</Label><Input id="auth-email" autoComplete="email" placeholder="vous@entreprise.com" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="auth-password">Mot de passe</Label><Input id="auth-password" autoComplete={mode === "in" ? "current-password" : "new-password"} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <>{mode === "in" ? "Se connecter" : "Créer le compte"}<ArrowRight /></>}</Button>
        </form>
        <Button variant="link" className="mt-6 h-auto self-center p-0 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
        </Button>
      </main>
      <BiizFooter />
    </div>
  );
}
