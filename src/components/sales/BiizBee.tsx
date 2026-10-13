/** Emblème BIIZ Sales Forces : abeille géométrique (hexagone-corps, deux ailes, trois bandes). */
export function BiizBee({ size = 24, className, title = "BIIZ Sales Forces" }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={title} className={className}>
      <title>{title}</title>
      <ellipse cx="15" cy="15" rx="9" ry="6.5" transform="rotate(-30 15 15)" fill="currentColor" opacity="0.28" />
      <ellipse cx="33" cy="15" rx="9" ry="6.5" transform="rotate(30 33 15)" fill="currentColor" opacity="0.28" />
      <path d="M24 12 L35 18.5 V31.5 L24 38 L13 31.5 V18.5 Z" fill="var(--sales-lime)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M13.5 23 H34.5 M13.5 29 H34.5" stroke="currentColor" strokeWidth="3" />
      <path d="M24 38 L24 43" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 12 Q18 7 15 6 M28 12 Q30 7 33 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
