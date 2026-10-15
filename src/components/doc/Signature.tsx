"use client";

import type { SignatureStyle } from "@/lib/types";

export const SIGNATURE_STYLES: { id: SignatureStyle; label: string; family: string; size: number; weight: number }[] = [
  { id: "amatic", label: "כתב יד עברי", family: "var(--font-amatic)", size: 46, weight: 700 },
  { id: "karantina", label: "כתב יד צר", family: "var(--font-karantina)", size: 44, weight: 400 },
  { id: "vibes", label: "קליגרפיה (אנגלית)", family: "var(--font-vibes)", size: 42, weight: 400 },
  { id: "dancing", label: "זורם (אנגלית)", family: "var(--font-dancing)", size: 38, weight: 600 },
  { id: "caveat", label: "עט מהיר (אנגלית)", family: "var(--font-caveat)", size: 40, weight: 600 },
  { id: "drawn", label: "חתימה מצוירת ביד", family: "", size: 0, weight: 0 },
];

type Props = {
  name: string;
  style: SignatureStyle;
  color: string;
  image?: string | null;
  height?: number;
};

/** חתימה בכתב יד — מגופן כתב-יד או מתמונה שצוירה */
export default function Signature({ name, style, color, image, height = 70 }: Props) {
  if (style === "drawn" && image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={`חתימת ${name}`} style={{ height, width: "auto", maxWidth: 220, objectFit: "contain" }} />;
  }
  const s = SIGNATURE_STYLES.find((x) => x.id === style) ?? SIGNATURE_STYLES[0];
  const display = name || "חתימה";
  return (
    <div style={{ position: "relative", display: "inline-block", height, minWidth: 140, lineHeight: 1 }} aria-label={`חתימת ${name}`}>
      <span
        style={{
          fontFamily: s.family || "var(--font-amatic)",
          fontSize: s.size * (height / 70),
          fontWeight: s.weight,
          color,
          display: "inline-block",
          transform: "rotate(-4deg) skewX(-6deg)",
          transformOrigin: "center",
          whiteSpace: "nowrap",
          paddingInline: 6,
          lineHeight: 1.1,
        }}
      >
        {display}
      </span>
      <svg
        viewBox="0 0 200 24"
        preserveAspectRatio="none"
        style={{ position: "absolute", insetInline: 0, bottom: 2, width: "100%", height: 16 }}
        aria-hidden
      >
        <path
          d="M4 16 C 40 6, 70 22, 110 12 S 170 4, 196 10"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
