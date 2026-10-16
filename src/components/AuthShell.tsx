import type { ReactNode } from "react";
import { BrandMark, BrandWordmark } from "@/components/BrandLogo";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#16263F] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 left-24 size-[28rem] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <BrandMark size={48} inverted />
          <BrandWordmark size={34} light />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">
            הצעות מחיר
            <span className="block text-[#F2A93B]">שנסגרות.</span>
          </h2>
          <p className="mt-4 text-lg text-white/70">
            הצעה מעוצבת עם הלוגו, החתימה והחותמת שלך — נשלחת בוואטסאפ או במייל, והלקוח מאשר בלחיצה. סגרנו.
          </p>
          <MiniDoc />
        </div>
        <div className="relative text-sm text-white/40">© {new Date().getFullYear()} סגרנו</div>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark size={40} />
            <BrandWordmark size={28} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-stone-500">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}


function MiniDoc() {
  return (
    <div className="mt-10 w-80 rotate-[-3deg] rounded-xl bg-white p-5 text-stone-800 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-20 rounded bg-[#16263F]" />
        <div className="text-xs font-bold text-[#16263F]">הצעת מחיר</div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2 w-full rounded bg-stone-100" />
        <div className="h-2 w-5/6 rounded bg-stone-100" />
        <div className="h-2 w-2/3 rounded bg-stone-100" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="rounded-md bg-[#16263F] px-3 py-1.5 text-xs font-bold text-white">₪ 12,980</div>
        <div className="grid size-14 rotate-[-10deg] place-items-center rounded-full border-2 border-blue-700/80 text-[9px] font-bold text-blue-700/80">
          מאושר
        </div>
      </div>
    </div>
  );
}
