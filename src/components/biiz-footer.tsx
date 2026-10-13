import { cn } from "@/lib/utils";

/** Mention de marque affichée en bas de chaque écran BIIZ. */
export function BiizFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("biiz-credit", className)}>
      <span className="biiz-credit-brand">BIIZ</span>
      <span className="biiz-credit-dot" aria-hidden />
      <span>par Axium Studios</span>
    </footer>
  );
}
