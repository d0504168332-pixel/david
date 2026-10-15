"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { A4_WIDTH, A4_HEIGHT } from "./QuoteDocument";

/** מקטין את דף ה-A4 כך שיתאים לרוחב הקונטיינר, בלי לשנות את הדף עצמו (חשוב ל-PDF) */
export default function DocPreview({ children, maxScale = 1 }: { children: ReactNode; maxScale?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [h, setH] = useState(A4_HEIGHT);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(maxScale, el.clientWidth / A4_WIDTH);
      setScale(s);
      setH((inner.current?.scrollHeight ?? A4_HEIGHT) * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div ref={wrap} style={{ width: "100%", height: h }} className="relative">
      <div
        ref={inner}
        className="doc-shadow"
        style={{
          width: A4_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top right",
          position: "absolute",
          top: 0,
          right: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
