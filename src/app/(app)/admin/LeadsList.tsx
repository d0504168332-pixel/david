"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, MessageCircle, Phone, Plus, RotateCcw } from "lucide-react";
import { setLeadStatus } from "@/app/actions/leads";

export type Lead = {
  id: string;
  full_name: string;
  business_name: string | null;
  phone: string;
  email: string | null;
  business_type: string | null;
  team_size: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

export default function LeadsList({ leads }: { leads: Lead[] }) {
  const [pending, start] = useTransition();
  const fresh = leads.filter((l) => l.status !== "done");
  const done = leads.filter((l) => l.status === "done").slice(0, 10);
  const row = (l: Lead) => {
    const intl = l.phone.replace(/\D/g, "").replace(/^0/, "972");
    const isDone = l.status === "done";
    return (
      <div key={l.id} className={`rounded-xl border p-3.5 ${isDone ? "border-stone-200 opacity-60" : "border-amber-200 bg-amber-50/40"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-extrabold">
              {l.full_name}
              {l.business_name ? <span className="font-semibold text-stone-500"> · {l.business_name}</span> : null}
            </div>
            <div className="mt-0.5 text-sm text-stone-600">
              <span dir="ltr">{l.phone}</span>
              {l.email ? <span className="break-all"> · {l.email}</span> : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {l.business_type ? <span className="rounded-full bg-white px-2 py-0.5 font-bold ring-1 ring-stone-200">{l.business_type}</span> : null}
              {l.team_size ? <span className="rounded-full bg-white px-2 py-0.5 font-bold ring-1 ring-stone-200">{l.team_size} עובדים</span> : null}
              <span className="text-stone-400">{new Date(l.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
            {l.message ? <p className="mt-1.5 whitespace-pre-line text-sm">{l.message}</p> : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`https://wa.me/${intl}`} target="_blank" rel="noreferrer" className="btn-ghost h-9 text-sm text-emerald-700">
            <MessageCircle className="size-4" /> וואטסאפ
          </a>
          <a href={`tel:${l.phone}`} className="btn-ghost h-9 text-sm">
            <Phone className="size-4" /> חיוג
          </a>
          {!isDone ? (
            <Link href="/admin/new" className="btn-ghost h-9 text-sm">
              <Plus className="size-4" /> פתיחת עסק
            </Link>
          ) : null}
          <button className="btn-ghost h-9 text-sm" disabled={pending} onClick={() => start(() => setLeadStatus(l.id, isDone ? "new" : "done"))}>
            {isDone ? <RotateCcw className="size-4" /> : <Check className="size-4" />} {isDone ? "החזרה לטיפול" : "טופל"}
          </button>
        </div>
      </div>
    );
  };
  return (
    <section className="card mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
        בקשות מנוי
        {fresh.length ? <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{fresh.length} חדשות</span> : null}
      </h2>
      <p className="mb-4 text-sm text-stone-500">אנשים שהשאירו פרטים בדף ההצטרפות (קישור ״אין לך משתמש?״ בדף הכניסה).</p>
      {leads.length === 0 ? (
        <div className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">עוד אין בקשות. הקישור לשיתוף: <span dir="ltr" className="font-bold">sgarnu.vercel.app/join</span></div>
      ) : (
        <div className="space-y-2.5">
          {fresh.map(row)}
          {done.length ? <div className="pt-2 text-xs font-bold text-stone-400">טופלו לאחרונה</div> : null}
          {done.map(row)}
        </div>
      )}
    </section>
  );
}
