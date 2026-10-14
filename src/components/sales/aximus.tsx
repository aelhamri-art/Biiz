import { useRef, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLiveVoice } from "@/hooks/use-live-voice";
import { Button } from "@/components/ui/button";
import { BiizBee } from "./BiizBee";

/** Aximus — coach vocale Livroum, disponible à tout moment depuis l'écran Coach. */
export function Aximus({ wsId }: { wsId: string }) {
  const token = useRef("");
  const [preparing, setPreparing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const call = useLiveVoice({
    startData: () => ({ token: token.current, workspaceId: wsId }),
    onEvent: (e) => {
      if (e.type === "app.greeting.error") setNotice("Aximus n'a pas pu lancer la salutation, parle-lui directement.");
      if (e.type === "app.delegation.pending") setNotice("Aximus consulte tes prospects…");
      if (e.type === "app.connected") setNotice(null);
    },
  });
  const live = call.status === "connected" || call.status === "connecting" || call.status === "stopping";

  async function start() {
    setNotice(null);
    setPreparing(true);
    const { data } = await supabase.auth.getSession();
    setPreparing(false);
    if (!data.session) { setNotice("Session expirée, reconnecte-toi."); return; }
    token.current = data.session.access_token;
    call.start();
  }

  const label =
    call.status === "connecting" ? "Aximus arrive…"
    : call.status === "connected" ? "En conversation"
    : call.status === "stopping" ? "Fin de la séance…"
    : "Disponible";

  return (
    <section className="sales-card relative overflow-hidden" aria-label="Aximus, coach vocale">
      <div className="sales-stripes absolute inset-x-0 top-0 h-1" aria-hidden />
      <div className="flex items-center gap-4">
        <div className={`relative grid size-14 shrink-0 place-items-center rounded-full bg-foreground ${call.status === "connected" ? "aximus-pulse" : ""}`}>
          <BiizBee size={34} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Coach vocale · {label}</p>
          <h2 className="text-lg font-semibold tracking-tight">Aximus</h2>
          <p className="text-sm text-muted-foreground">Directrice commerciale et manager. Elle connaît ton prénom, tes prospects et tes progrès.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!live ? (
          <Button className="h-12 flex-1" onClick={start} disabled={preparing}>
            {preparing ? <Loader2 className="animate-spin" /> : <Mic />}Parler à Aximus
          </Button>
        ) : (
          <>
            <Button variant="outline" className="h-12 flex-1" onClick={() => call.setMuted(!call.muted)} disabled={call.status !== "connected"} aria-pressed={call.muted}>
              {call.muted ? <MicOff /> : <Mic />}{call.muted ? "Micro coupé" : "Micro actif"}
            </Button>
            <Button variant="destructive" className="h-12 flex-1" onClick={() => call.stop()}><PhoneOff />Terminer</Button>
          </>
        )}
        {call.playbackBlocked && <Button variant="outline" className="h-12 w-full" onClick={() => call.resumePlayback()}><Play />Activer le son</Button>}
      </div>
      {!live && <p className="mt-3 text-xs text-muted-foreground">Exemples : « Prépare-moi pour mon prochain appel », « Joue un patron pressé », « Débriefe mon appel avec Le Bistrot ».</p>}
      {(notice || call.error) && <p className="mt-3 text-sm" role="status">{call.error ? `Connexion vocale impossible : ${call.error}` : notice}</p>}
      <audio ref={call.audioRef} className="sr-only" />
    </section>
  );
}
