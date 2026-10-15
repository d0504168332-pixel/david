"use client";

import { useId } from "react";

type Props = {
  businessName: string;
  fullName: string;
  jobTitle?: string | null;
  taxId?: string | null;
  color: string;
  shape?: "round" | "rect";
  size?: number;
  rotate?: number;
};

/** חותמת דיו — עגולה או מלבנית, נוצרת אוטומטית מפרטי העסק והחותם */
export default function Stamp({
  businessName,
  fullName,
  jobTitle,
  taxId,
  color,
  shape = "round",
  size = 150,
  rotate = -9,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const ink = `ink-${uid}`;

  const filter = (
    <filter id={ink} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
      <feColorMatrix
        in="noise"
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.85 1.32"
        result="mask"
      />
      <feComposite in="SourceGraphic" in2="mask" operator="in" result="speckled" />
      <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="1" seed="3" result="warp" />
      <feDisplacementMap in="speckled" in2="warp" scale="1.6" />
    </filter>
  );

  if (shape === "rect") {
    const w = size * 1.45;
    const h = size * 0.82;
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 218 123"
        style={{ transform: `rotate(${rotate / 2}deg)`, opacity: 0.88 }}
        aria-label={`חותמת ${businessName}`}
      >
        <defs>{filter}</defs>
        <g filter={`url(#${ink})`} fill={color} stroke={color}>
          <rect x="3" y="3" width="212" height="117" rx="8" fill="none" strokeWidth="3.2" />
          <rect x="9" y="9" width="200" height="105" rx="5" fill="none" strokeWidth="1.2" />
          <text x="109" y="37" textAnchor="middle" fontSize="19" fontWeight="800" stroke="none" style={{ fontFamily: "var(--font-heebo)" }}>
            {businessName}
          </text>
          {taxId ? (
            <text x="109" y="56" textAnchor="middle" fontSize="11.5" fontWeight="600" stroke="none" style={{ fontFamily: "var(--font-heebo)" }}>
              ח.פ. {taxId}
            </text>
          ) : null}
          <line x1="30" y1="65" x2="188" y2="65" strokeWidth="1" />
          <text x="109" y="86" textAnchor="middle" fontSize="16" fontWeight="700" stroke="none" style={{ fontFamily: "var(--font-heebo)" }}>
            {fullName}
          </text>
          {jobTitle ? (
            <text x="109" y="104" textAnchor="middle" fontSize="11.5" fontWeight="500" stroke="none" style={{ fontFamily: "var(--font-heebo)" }}>
              {jobTitle}
            </text>
          ) : null}
        </g>
      </svg>
    );
  }

  const top = `top-${uid}`;
  const bottom = `bot-${uid}`;
  const bottomText = taxId ? `ח.פ. ${taxId}` : jobTitle || "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      style={{ transform: `rotate(${rotate}deg)`, opacity: 0.88 }}
      aria-label={`חותמת ${businessName}`}
    >
      <defs>
        {filter}
        {/* קשת עליונה: משמאל לימין מעל המרכז */}
        <path id={top} d="M 24 80 A 56 56 0 0 1 136 80" />
        {/* קשת תחתונה: משמאל לימין מתחת למרכז */}
        <path id={bottom} d="M 20 80 A 60 60 0 0 0 140 80" />
      </defs>
      <g filter={`url(#${ink})`} fill={color} stroke={color}>
        <circle cx="80" cy="80" r="76" fill="none" strokeWidth="3.4" />
        <circle cx="80" cy="80" r="70" fill="none" strokeWidth="1.1" />
        <circle cx="80" cy="80" r="45" fill="none" strokeWidth="1.4" />
        <text fontSize="13.5" fontWeight="800" stroke="none" letterSpacing="0.5" style={{ fontFamily: "var(--font-heebo)" }}>
          <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">
            {businessName}
          </textPath>
        </text>
        {bottomText ? (
          <text fontSize="11" fontWeight="600" stroke="none" letterSpacing="0.6" style={{ fontFamily: "var(--font-heebo)" }}>
            <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle">
              {bottomText}
            </textPath>
          </text>
        ) : null}
        <text x="17" y="84" fontSize="10" stroke="none" textAnchor="middle">★</text>
        <text x="143" y="84" fontSize="10" stroke="none" textAnchor="middle">★</text>
        <text x="80" y={jobTitle && taxId ? 79 : 85} textAnchor="middle" fontSize={fullName.length > 12 ? 11.5 : 14} fontWeight="800" stroke="none" style={{ fontFamily: "var(--font-heebo)" }}>
          {fullName}
        </text>
        {jobTitle && taxId ? (
          <text x="80" y="95" textAnchor="middle" fontSize="9.5" fontWeight="500" stroke="none" style={{ fontFamily: "var(--font-heebo)" }}>
            {jobTitle}
          </text>
        ) : null}
      </g>
    </svg>
  );
}
