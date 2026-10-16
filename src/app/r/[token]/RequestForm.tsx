"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Plus, Trash2, Send, Bus, ArrowLeftRight } from "lucide-react";
import { submitRequest } from "@/app/actions/requests";
import type { Trip } from "@/lib/types";

type Known = { name: string; contact_name: string | null; phone: string | null; email: string | null; address: string | null } | null;

type Props = {
  token: string;
  clientToken?: string;
  known?: Known;
  type: "general" | "transport";
  intro: string | null;
  businessName: string;
  contact: { phone: string | null; email: string | null };
};

export default function RequestForm({ token, clientToken, known = null, type, intro, businessName, contact }: Props) {
  const [f, setF] = useState({
    client_name: known?.name ?? "",
    client_contact: known?.contact_name ?? "",
    client_phone: known?.phone ?? "",
    client_email: known?.email ?? "",
    request_text: "",
    notes: "",
    website: "",
  });
  const [editDetails, setEditDetails] = useState(!known);
  const [items, setItems] = useState([{ description: "", quantity: 1 }]);
  const [trip, setTrip] = useState<Trip>({ date: "", time: "", origin: known?.address ?? "", destination: "", passengers: undefined, round_trip: false, return_time: "", stops: "" });
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setT = (k: keyof Trip, v: string | number | boolean | undefined) => setTrip((p) => ({ ...p, [k]: v }));

  if (done)
    return (
      <div className="card p-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
        <h2 className="mt-4 text-2xl font-extrabold">הבקשה נשלחה!</h2>
        <p className="mx-auto mt-2 max-w-sm text-stone-600">
          תודה, {f.client_contact || f.client_name}. {businessName} יכינו עבורכם הצעת מחיר ויחזרו אליכם בהקדם עם קישור להצעה — שם תוכלו לצפות בה, להוריד PDF ולאשר בלחיצה.
        </p>
      </div>
    );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const r = await submitRequest({ token, client_token: clientToken, ...f, items, trip: type === "transport" ? { ...trip, passengers: trip.passengers ? Number(trip.passengers) : undefined } : null });
          if (r.error) setErr(r.error);
          else setDone(true);
        });
      }}
    >
      <section className="card p-5 sm:p-6">
        <p className="text-stone-600">{intro || "מלאו את הפרטים ונחזור אליכם עם הצעת מחיר מסודרת."}</p>
        {known && !editDetails ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand/[0.06] p-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{f.client_name}</div>
              <div className="text-stone-600">{[f.client_contact, f.client_phone, f.client_email].filter(Boolean).join(" · ")}</div>
            </div>
            <button type="button" className="text-sm font-semibold text-brand underline" onClick={() => setEditDetails(true)}>
              עדכון פרטים
            </button>
          </div>
        ) : null}
        <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${editDetails ? "" : "hidden"}`}>
          <In id="client_name" label="שם / שם החברה *" value={f.client_name} onChange={(v) => set("client_name", v)} required />
          <In id="client_contact" label="איש קשר" value={f.client_contact} onChange={(v) => set("client_contact", v)} />
          <In id="client_phone" label="טלפון" value={f.client_phone} onChange={(v) => set("client_phone", v)} ltr type="tel" />
          <In id="client_email" label="אימייל" value={f.client_email} onChange={(v) => set("client_email", v)} ltr type="email" />
        </div>
        <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.website} onChange={(e) => set("website", e.target.value)} name="website" />
      </section>

      {type === "transport" ? (
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
            <Bus className="size-5 text-brand" /> פרטי הנסיעה
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <In id="origin" required label="נקודת יציאה *" value={trip.origin ?? ""} onChange={(v) => setT("origin", v)} placeholder="עיר / כתובת" />
            <In id="destination" required label="יעד *" value={trip.destination ?? ""} onChange={(v) => setT("destination", v)} placeholder="עיר / כתובת" />
            <In id="date" required label="תאריך *" type="date" value={trip.date ?? ""} onChange={(v) => setT("date", v)} />
            <In id="time" label="שעת יציאה" type="time" value={trip.time ?? ""} onChange={(v) => setT("time", v)} />
            <In id="passengers" required label="מספר נוסעים *" type="number" value={trip.passengers ? String(trip.passengers) : ""} onChange={(v) => setT("passengers", v ? Number(v) : undefined)} />
            <In id="stops" label="עצירות בדרך" value={trip.stops ?? ""} onChange={(v) => setT("stops", v)} />
          </div>
          <label className="mt-4 flex items-center gap-2 font-semibold text-stone-700">
            <input type="checkbox" checked={!!trip.round_trip} onChange={(e) => setT("round_trip", e.target.checked)} className="size-4 accent-[var(--brand)]" />
            <ArrowLeftRight className="size-4" /> כולל חזור
          </label>
          {trip.round_trip ? (
            <div className="mt-3 max-w-xs">
              <In id="return_time" label="שעת חזור" type="time" value={trip.return_time ?? ""} onChange={(v) => setT("return_time", v)} />
            </div>
          ) : null}
        </section>
      ) : (
        <section className="card p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-extrabold">מה תרצו לקבל?</h2>
          <p className="mb-4 text-sm text-stone-500">שורה לכל מוצר או שירות. אפשר גם רק לכתוב בחופשיות למטה.</p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <input className="field flex-1" placeholder="לדוגמה: כרטיסי ביקור" value={it.description} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} aria-label={`פריט ${i + 1}`} />
                <input className="field w-24" type="number" min={1} value={it.quantity} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, quantity: e.target.valueAsNumber || 1 } : x)))} aria-label="כמות" />
                <button type="button" className="grid size-11 shrink-0 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-rose-600 disabled:opacity-30" disabled={items.length === 1} onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label="הסרה">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setItems((p) => [...p, { description: "", quantity: 1 }])} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
            <Plus className="size-4" /> שורה נוספת
          </button>
        </section>
      )}

      <section className="card p-5 sm:p-6">
        <label className="label" htmlFor="request_text">{type === "transport" ? "פרטים נוספים על הנסיעה" : "תיאור חופשי"}</label>
        <textarea id="request_text" className="field min-h-28" value={f.request_text} onChange={(e) => set("request_text", e.target.value)} placeholder={type === "transport" ? "סוג הרכב, ציוד, נגישות, מסלול מיוחד..." : "ספרו לנו בחופשיות מה אתם צריכים"} />
        <label className="label mt-3" htmlFor="notes">הערות</label>
        <textarea id="notes" className="field min-h-16" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="מועדים, תקציב, כל דבר שחשוב לדעת" />
      </section>

      {err ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-semibold text-rose-700">{err}</div> : null}
      <button className="btn-primary w-full py-3.5 text-base" disabled={pending}>
        {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="size-4" />}
        שליחת הבקשה
      </button>
      {contact.phone || contact.email ? (
        <p className="text-center text-sm text-stone-500">
          מעדיפים לדבר? {[contact.phone, contact.email].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </form>
  );
}

function In({ id, label, value, onChange, ltr, type = "text", required, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; ltr?: boolean; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type={type} required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} dir={ltr ? "ltr" : undefined} className={`field ${ltr ? "text-right" : ""}`} />
    </div>
  );
}
