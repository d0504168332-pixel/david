"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Wand2, Phone, Mail, Bus, Archive, RotateCcw, FileText, Inbox } from "lucide-react";
import { setRequestStatus } from "@/app/actions/requests";
import { formatDate } from "@/lib/quote";
import type { QuoteRequest } from "@/lib/types";

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `לפני ${Math.max(m, 1)} דק׳`;
  const h = Math.round(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return formatDate(iso);
}

export default function RequestCard({ r }: { r: QuoteRequest }) {
  const [, start] = useTransition();
  const t = r.trip;
  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-extrabold">{r.client_name}</div>
          {r.client_contact ? <div className="text-sm text-stone-600">{r.client_contact}</div> : null}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-stone-400">
          {r.source === "email" ? <Inbox className="size-3.5" /> : null}
          {r.source === "email" ? "מייל · " : "טופס · "}
          {ago(r.created_at)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-stone-500">
        {r.client_phone ? <span className="inline-flex items-center gap-1" dir="ltr"><Phone className="size-3.5" />{r.client_phone}</span> : null}
        {r.client_email ? <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{r.client_email}</span> : null}
      </div>

      {r.subject ? <div className="mt-2 text-sm font-semibold text-stone-700">נושא: {r.subject}</div> : null}
      {t ? (
        <div className="mt-3 rounded-xl bg-brand/5 p-3 text-sm">
          <div className="flex items-center gap-1.5 font-bold text-brand">
            <Bus className="size-4" /> {t.origin || "?"} ← {t.destination || "?"}
          </div>
          <div className="mt-0.5 text-stone-600">
            {[t.date && formatDate(t.date), t.time, t.passengers && `${t.passengers} נוסעים`, t.round_trip ? `הלוך-חזור${t.return_time ? ` (חזור ${t.return_time})` : ""}` : "כיוון אחד", t.stops && `עצירות: ${t.stops}`]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      ) : null}
      {r.items?.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {r.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-3 border-b border-dashed border-stone-200 pb-1">
              <span>{i.description}</span>
              <span className="font-bold tabular-nums text-stone-500">× {i.quantity}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {r.request_text ? (
        <details className="mt-3 text-sm text-stone-700" open={!r.items?.length && r.source !== "email"}>
          <summary className="cursor-pointer font-semibold text-stone-500">{r.source === "email" ? "תוכן המייל" : "מה הלקוח כתב"}</summary>
          <p className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap">{r.request_text}</p>
        </details>
      ) : null}
      {r.notes ? <p className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{r.notes}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        {r.quote_id ? (
          <Link href={`/quotes/${r.quote_id}`} className="btn-ghost px-3 py-2 text-sm">
            <FileText className="size-4" /> ההצעה שנשלחה
          </Link>
        ) : (
          <Link href={`/quotes/new?request=${r.id}`} className="btn-primary px-3 py-2 text-sm">
            <Wand2 className="size-4" /> בנה הצעת מחיר
          </Link>
        )}
        {r.status !== "closed" ? (
          <button className="btn-ghost px-3 py-2 text-sm text-stone-500" onClick={() => start(() => setRequestStatus(r.id, "closed"))}>
            <Archive className="size-4" /> סגירה
          </button>
        ) : (
          <button className="btn-ghost px-3 py-2 text-sm text-stone-500" onClick={() => start(() => setRequestStatus(r.id, r.quote_id ? "quoted" : "new"))}>
            <RotateCcw className="size-4" /> פתיחה מחדש
          </button>
        )}
      </div>
    </div>
  );
}
