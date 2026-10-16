/** הלוגו של סגרנו: סמל (וי בצורת חתימה) ושם המותג */
export const BRAND = { name: "סגרנו", tagline: "הצעות מחיר שנסגרות", ink: "#16263F", gold: "#F2A93B", paper: "#F6F3EC" };

export function BrandMark({ size = 40, inverted = false, className = "" }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="סגרנו">
      <rect width="120" height="120" rx="30" fill={inverted ? BRAND.paper : BRAND.ink} />
      <path
        d="M28 62 L50 83 C64 63 78 46 97 29"
        fill="none"
        stroke={inverted ? BRAND.ink : BRAND.gold}
        strokeWidth={size < 40 ? 17 : 15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandWordmark({ size = 28, light = false }: { size?: number; light?: boolean }) {
  const badge = Math.round(size * 0.42);
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.12 }}>
      <span style={{ fontFamily: "var(--font-display), var(--font-heebo), sans-serif", fontSize: size, lineHeight: 1, color: light ? BRAND.paper : BRAND.ink }}>
        {BRAND.name}
      </span>
      <svg width={badge} height={badge} viewBox="0 0 54 54" aria-hidden="true" style={{ marginTop: size * 0.25 }}>
        <circle cx="27" cy="27" r="27" fill={BRAND.gold} />
        <path d="M15 28 L24 37 L40 18" fill="none" stroke={BRAND.ink} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
