/** Emblème BIIZ Sales : abeille géométrique jaune et blanche sur tuile noire (même vecteur à 24px comme à 96px). */
export function BiizBee({ size = 24, className, title = "BIIZ Sales" }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <rect width="48" height="48" rx="12" fill="var(--sales-ink)" />
      <ellipse cx="15" cy="15" rx="9" ry="6.5" transform="rotate(-30 15 15)" fill="var(--sales-paper)" />
      <ellipse cx="33" cy="15" rx="9" ry="6.5" transform="rotate(30 33 15)" fill="var(--sales-paper)" />
      <path d="M24 12 L35 18.5 V31.5 L24 38 L13 31.5 V18.5 Z" fill="var(--sales-yellow)" stroke="var(--sales-ink)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M13.5 23 H34.5 M13.5 29 H34.5" stroke="var(--sales-ink)" strokeWidth="3" />
      <path d="M24 38 L24 42.5" stroke="var(--sales-yellow)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 12 Q18 7 15 6 M28 12 Q30 7 33 6" stroke="var(--sales-yellow)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Logo complet : emblème + wordmark BIIZ + étiquette SALES rayée. */
export function BiizSalesLogo({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="BIIZ Sales">
      <BiizBee size={size} />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[19px] font-black tracking-[-0.04em]">BIIZ</span>
        <span className="sales-tag">SALES</span>
      </span>
    </span>
  );
}
