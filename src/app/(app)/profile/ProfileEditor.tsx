"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eraser, Save } from "lucide-react";
import Signature, { SIGNATURE_STYLES } from "@/components/doc/Signature";
import Stamp, { STAMP_SHAPES } from "@/components/doc/Stamp";
import { Toggle } from "@/components/QuoteEditor";
import FormMessage from "@/components/FormMessage";
import { updateMyProfile, type ProfileInput } from "@/app/actions/settings";
import type { Profile, SignatureStyle } from "@/lib/types";

const SIG_COLORS = ["#1e3a8a", "#111827", "#1d4ed8", "#0f766e"];
const STAMP_COLORS = ["#1d4ed8", "#6d28d9", "#b91c1c", "#047857", "#111827"];

export default function ProfileEditor({ profile, businessName, taxId }: { profile: Profile; businessName: string; taxId: string | null }) {
  const [p, setP] = useState<ProfileInput>({
    full_name: profile.full_name,
    job_title: profile.job_title ?? "",
    phone: profile.phone ?? "",
    signature_style: profile.signature_style,
    signature_image: profile.signature_image,
    signature_color: profile.signature_color,
    stamp_color: profile.stamp_color,
    stamp_shape: profile.stamp_shape,
    show_signature: profile.show_signature,
    show_stamp: profile.show_stamp,
  });
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | undefined>();
  const [pending, start] = useTransition();
  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setP((x) => ({ ...x, [k]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="mb-4 text-[17px] font-extrabold">הפרטים שלי</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">שם מלא (מופיע בחתימה ובחותמת)</label>
              <input className="field" value={p.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div>
              <label className="label">תפקיד</label>
              <input className="field" value={p.job_title} placeholder="לדוגמה: מנכ״ל" onChange={(e) => set("job_title", e.target.value)} />
            </div>
            <div>
              <label className="label">טלפון</label>
              <input className="field text-right" dir="ltr" value={p.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">חתימה</h2>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-600">
              להציג בהצעות <Toggle checked={p.show_signature} onChange={(v) => set("show_signature", v)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SIGNATURE_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => set("signature_style", s.id)}
                className={`flex h-28 flex-col items-center justify-between rounded-xl border-2 p-2 transition ${p.signature_style === s.id ? "border-brand bg-brand/5" : "border-stone-200 hover:border-stone-300"}`}
              >
                <div className="grid flex-1 place-items-center overflow-hidden">
                  {s.id === "drawn" ? (
                    p.signature_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.signature_image} alt="" className="max-h-14 object-contain" />
                    ) : (
                      <span className="text-xs text-stone-400">ציירו למטה ✍</span>
                    )
                  ) : (
                    <Signature name={p.full_name || "השם שלך"} style={s.id as SignatureStyle} color={p.signature_color} height={48} />
                  )}
                </div>
                <span className="text-xs font-semibold text-stone-600">{s.label}</span>
              </button>
            ))}
          </div>
          {p.signature_style === "drawn" ? <DrawPad value={p.signature_image} color={p.signature_color} onChange={(img) => set("signature_image", img)} /> : null}
          <div className="mt-4">
            <label className="label">צבע הדיו</label>
            <Swatches value={p.signature_color} options={SIG_COLORS} onChange={(c) => set("signature_color", c)} />
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">חותמת</h2>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-600">
              להציג בהצעות <Toggle checked={p.show_stamp} onChange={(v) => set("show_stamp", v)} />
            </label>
          </div>
          <p className="mb-3 text-sm text-stone-500">החותמת נוצרת אוטומטית משם העסק, השם והתפקיד שלך.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {STAMP_SHAPES.map(({ id: shape, label }) => (
              <button
                key={shape}
                type="button"
                onClick={() => set("stamp_shape", shape)}
                className={`flex h-44 flex-col items-center justify-between gap-1 overflow-hidden rounded-xl border-2 p-2 transition ${p.stamp_shape === shape ? "border-brand bg-brand/5" : "border-stone-200 hover:border-stone-300"}`}
              >
                <div className="grid w-full flex-1 place-items-center overflow-hidden">
                  <Stamp businessName={businessName} fullName={p.full_name || "השם שלך"} jobTitle={p.job_title} taxId={taxId} color={p.stamp_color} shape={shape} size={shape === "round" ? 112 : shape === "rect" ? 88 : 104} />
                </div>
                <span className="text-xs font-semibold text-stone-600">{label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <label className="label">צבע החותמת</label>
            <Swatches value={p.stamp_color} options={STAMP_COLORS} onChange={(c) => set("stamp_color", c)} />
          </div>
        </section>
      </div>

      {/* תצוגה מקדימה */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="card overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-3 text-sm font-semibold text-stone-500">כך זה ייראה בתחתית ההצעה</div>
          <div className="bg-white px-6 py-8">
            <div className="flex items-end justify-between gap-2">
              <div className="text-[13px]">
                <div className="text-stone-500">בברכה,</div>
                <div className="text-[15px] font-extrabold">{p.full_name || "השם שלך"}</div>
                {p.job_title ? <div className="text-stone-600">{p.job_title}</div> : null}
                <div className="text-xs text-stone-500" dir="ltr" style={{ textAlign: "right" }}>{[p.phone, profile.email].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="flex flex-col items-center">
                {p.show_stamp ? (
                  <div className={p.show_signature ? (p.stamp_shape === "round" || p.stamp_shape === "rect" ? "-mb-3" : "-mb-1") : ""}>
                    <Stamp businessName={businessName} fullName={p.full_name || "השם שלך"} jobTitle={p.job_title} taxId={taxId} color={p.stamp_color} shape={p.stamp_shape} size={p.stamp_shape === "round" ? 96 : p.stamp_shape === "rect" ? 86 : 118} />
                  </div>
                ) : null}
                {p.show_signature ? (
                  <div className="relative text-center">
                    <Signature name={p.full_name} style={p.signature_style as SignatureStyle} color={p.signature_color} image={p.signature_image} height={54} />
                    <div className="mt-0.5 border-t border-stone-300 pt-0.5 text-[10px] text-stone-500">חתימה</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-3 border-t border-stone-100 p-4">
            <FormMessage state={msg} />
            <button
              className="btn-primary w-full"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setMsg(undefined);
                  if (p.signature_style === "drawn" && !p.signature_image) {
                    setMsg({ error: "ציירו חתימה או בחרו סגנון אחר" });
                    return;
                  }
                  setMsg(await updateMyProfile(p));
                })
              }
            >
              {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="size-4" />}
              שמירה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Swatches({ value, options, onChange }: { value: string; options: string[]; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((c) => (
        <button key={c} type="button" aria-label={c} onClick={() => onChange(c)} className={`size-8 rounded-full ring-offset-2 transition ${value === c ? "ring-2 ring-ink" : "hover:scale-110"}`} style={{ background: c }} />
      ))}
      <label className="relative size-8 cursor-pointer overflow-hidden rounded-full border border-stone-300 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title="צבע מותאם">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

function DrawPad({ value, color, onChange }: { value: string | null; color: string; onChange: (img: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    if (value) {
      const img = new Image();
      img.onload = () => {
        const w = c.offsetWidth;
        const h = c.offsetHeight;
        const s = Math.min(w / img.width, h / img.height);
        ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
      };
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const exportTrimmed = () => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const { width, height } = c;
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (data[(y * width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
    if (maxX <= minX) return null;
    const pad = 8;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width, maxX + pad);
    maxY = Math.min(height, maxY + pad);
    const out = document.createElement("canvas");
    const scale = Math.min(1, 520 / (maxX - minX));
    out.width = (maxX - minX) * scale;
    out.height = (maxY - minY) * scale;
    out.getContext("2d")!.drawImage(c, minX, minY, maxX - minX, maxY - minY, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  };

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">ציירו את החתימה (עכבר או אצבע)</span>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-rose-600"
          onClick={() => {
            const c = ref.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            onChange(null);
          }}
        >
          <Eraser className="size-4" /> ניקוי
        </button>
      </div>
      <canvas
        ref={ref}
        className="h-44 w-full touch-none rounded-xl border-2 border-dashed border-stone-300 bg-[linear-gradient(transparent_calc(100%-42px),#e7e5e4_calc(100%-42px),#e7e5e4_calc(100%-41px),transparent_calc(100%-41px))] bg-white"
        onPointerDown={(e) => {
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = pos(e);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const ctx = ref.current!.getContext("2d")!;
          const p = pos(e);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.6;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          last.current = p;
          dirty.current = true;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
          if (dirty.current) {
            dirty.current = false;
            onChange(exportTrimmed());
          }
        }}
      />
    </div>
  );
}
