import type { ReactNode } from "react";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#1f3a5f] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 left-24 size-[28rem] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <Mark />
          <span className="text-xl font-extrabold tracking-tight">QuoteCraft</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">
            הצעות מחיר שנראות
            <span className="block text-[#c8a35a]">כמו העסק שלך.</span>
          </h2>
          <p className="mt-4 text-lg text-white/70">
            לוגו, חתימה וחותמת אישית לכל איש צוות — ו-PDF מוכן לשליחה במייל או בוואטסאפ, תוך דקה.
          </p>
          <MiniDoc />
        </div>
        <div className="relative text-sm text-white/40">© {new Date().getFullYear()} QuoteCraft</div>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Mark dark />
            <span className="text-lg font-extrabold">QuoteCraft</span>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-stone-500">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}

function Mark({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`grid size-10 place-items-center rounded-xl ${dark ? "bg-[#1f3a5f] text-white" : "bg-white text-[#1f3a5f]"}`}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    </div>
  );
}

function MiniDoc() {
  return (
    <div className="mt-10 w-80 rotate-[-3deg] rounded-xl bg-white p-5 text-stone-800 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-20 rounded bg-[#1f3a5f]" />
        <div className="text-xs font-bold text-[#1f3a5f]">הצעת מחיר</div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2 w-full rounded bg-stone-100" />
        <div className="h-2 w-5/6 rounded bg-stone-100" />
        <div className="h-2 w-2/3 rounded bg-stone-100" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="rounded-md bg-[#1f3a5f] px-3 py-1.5 text-xs font-bold text-white">₪ 12,980</div>
        <div className="grid size-14 rotate-[-10deg] place-items-center rounded-full border-2 border-blue-700/80 text-[9px] font-bold text-blue-700/80">
          מאושר
        </div>
      </div>
    </div>
  );
}
