"use client";

import { useMemo, useState, useTransition } from "react";
import { Bell, BellRing, Bus, Calculator, Plus, Save, Trash2 } from "lucide-react";
import { saveAutomation, type AutomationInput } from "@/app/actions/settings";
import { pricePlans } from "@/lib/pricing";
import type { Pricing, Vehicle } from "@/lib/types";
import { Toggle } from "@/components/QuoteEditor";

type Props = { transport: boolean; initial: AutomationInput; mailReady: boolean; mapsGoogle: boolean };

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

export default function AutomationForm({ transport, initial, mailReady, mapsGoogle }: Props) {
  const [s, setS] = useState<AutomationInput>(initial);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const p = s.pricing ?? {};
  const setP = (patch: Partial<Pricing>) => setS((x) => ({ ...x, pricing: { ...(x.pricing ?? {}), ...patch } }));
  const vehicles = p.vehicles ?? [];
  const setV = (id: string, patch: Partial<Vehicle>) => setP({ vehicles: vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) });

  // דוגמה חיה: תל אביב–ירושלים, 50 נוסעים, הלוך-חזור
  const sample = useMemo(
    () =>
      transport
        ? pricePlans({ distance_km: 62, duration_min: 60, passengers: 50, round_trip: true, time: "08:00", return_time: "17:30", date: "2026-11-18" }, s.pricing)
        : [],
    [s.pricing, transport]
  );

  const save = () =>
    start(async () => {
      setMsg(null);
      setMsg((await saveAutomation(s)) ?? null);
    });

  const num = (v: number | undefined, on: (n: number) => void, cls = "w-24", step = "any") => (
    <input type="number" min={0} step={step} className={`field ${cls}`} value={v ?? ""} onChange={(e) => on(e.target.valueAsNumber || 0)} />
  );

  return (
    <div className="space-y-6">
      {transport ? (
        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
            <Bus className="size-5 text-brand" /> מחירון קבוע
          </h2>
          {p.mode === "cost" ? (
            <div className="mb-4 rounded-xl bg-brand/5 p-3 text-sm ring-1 ring-brand/20">
              ההצעות מחושבות כרגע לפי <a href="/calculator" className="font-bold text-brand underline">מחשבון העלויות</a>. כאן מגדירים את סוגי הרכבים, מחיר מינימום, תוספות ועיגול.
            </div>
          ) : null}
          <p className="mb-4 text-sm text-stone-500">
            לפי המחירון המערכת מחשבת מחיר לכל הצעה: מרחק × מחיר לק״מ (לפחות מחיר המינימום), המתנה ותוספות. המחיר תמיד ניתן לשינוי בהצעה עצמה.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-right text-xs text-stone-500">
                  <th className="pb-2 font-semibold">סוג רכב</th>
                  <th className="pb-2 font-semibold">מקומות</th>
                  <th className="pb-2 font-semibold">₪ לק״מ</th>
                  <th className="pb-2 font-semibold">מחיר מינימום ₪</th>
                  <th className="pb-2 font-semibold">שעת המתנה ₪</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-t border-stone-100">
                    <td className="py-2 pe-2">
                      <input className="field" value={v.name} onChange={(e) => setV(v.id, { name: e.target.value })} />
                    </td>
                    <td className="py-2 pe-2">{num(v.seats, (n) => setV(v.id, { seats: n }), "w-20", "1")}</td>
                    <td className="py-2 pe-2">{num(v.per_km, (n) => setV(v.id, { per_km: n }))}</td>
                    <td className="py-2 pe-2">{num(v.min_price, (n) => setV(v.id, { min_price: n }), "w-28")}</td>
                    <td className="py-2 pe-2">{num(v.wait_hour, (n) => setV(v.id, { wait_hour: n }))}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        title="הסרה"
                        disabled={vehicles.length <= 1}
                        onClick={() => setP({ vehicles: vehicles.filter((x) => x.id !== v.id) })}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-2 flex items-center gap-1 text-sm font-bold text-brand"
            onClick={() => setP({ vehicles: [...vehicles, { id: `v${Date.now().toString(36)}`, name: "רכב חדש", seats: 14, per_km: 6, min_price: 500, wait_hour: 80 }] })}
          >
            <Plus className="size-4" /> סוג רכב
          </button>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="mb-2 text-sm font-bold">תוספת לילה</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {num(p.night_pct, (n) => setP({ night_pct: n }), "w-20")}% בין
                <input type="time" className="field w-28" value={p.night_from ?? ""} onChange={(e) => setP({ night_from: e.target.value })} />ל-
                <input type="time" className="field w-28" value={p.night_to ?? ""} onChange={(e) => setP({ night_to: e.target.value })} />
              </div>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="mb-2 text-sm font-bold">תוספת שבת</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {num(p.weekend_pct, (n) => setP({ weekend_pct: n }), "w-20")}% · בשישי החל מ-
                <input type="time" className="field w-28" value={p.friday_from ?? ""} onChange={(e) => setP({ friday_from: e.target.value })} />
              </div>
            </div>
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="mb-2 text-sm font-bold">המתנה ועיגול</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {num(p.free_wait_hours, (n) => setP({ free_wait_hours: n }), "w-16")} שעות המתנה חינם · עיגול ל-
                {num(p.round_up, (n) => setP({ round_up: n }), "w-16", "1")}₪
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-brand/20 bg-brand/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
              <Calculator className="size-4" /> דוגמה: תל אביב ← ירושלים (62 ק״מ), 50 נוסעים, הלוך-חזור 08:00–17:30
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-3">
              {sample.map((pl) => (
                <li key={pl.vehicle.id} className="rounded-lg bg-white p-2.5 text-sm ring-1 ring-stone-200">
                  <div className="font-bold">{pl.label}</div>
                  <div className="text-lg font-extrabold tabular-nums">{shekel(pl.total)}</div>
                  <div className="text-xs text-stone-500">{pl.lines.join(" · ")}</div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            חישוב המרחק: {mapsGoogle ? "גוגל מפות" : "OpenStreetMap (חינמי). לדיוק מרבי אפשר לחבר מפתח של גוגל מפות"}.
          </p>
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
          <BellRing className="size-5 text-brand" /> תזכורת ללקוח שלא ענה
        </h2>
        <p className="mb-4 text-sm text-stone-500">הצעה שנשלחה ולא אושרה מקבלת תזכורת מנומסת במייל, עם קישור לאישור.</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>לשלוח תזכורת אחרי</span>
          {num(s.reminder_days, (n) => setS((x) => ({ ...x, reminder_days: Math.round(n) })), "w-20", "1")}
          <span>ימים, ועד</span>
          {num(s.reminder_max, (n) => setS((x) => ({ ...x, reminder_max: Math.max(1, Math.round(n)) })), "w-20", "1")}
          <span>תזכורות להצעה.</span>
          <span className="text-stone-500">(0 ימים = כבוי)</span>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          ללקוח בלי מייל: בדף ההצעות יש לשונית &quot;מחכות לתזכורת&quot; עם כפתור וואטסאפ מוכן.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
          <Bell className="size-5 text-brand" /> התראות אליך
        </h2>
        <p className="mb-4 text-sm text-stone-500">מייל לאיש הצוות שהפיק את ההצעה, ברגע שקורה משהו.</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            הלקוח פתח את ההצעה (בפעם הראשונה)
            <Toggle checked={s.notify_on_view} onChange={(v) => setS((x) => ({ ...x, notify_on_view: v }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            הלקוח אישר את ההצעה
            <Toggle checked={s.notify_on_approve} onChange={(v) => setS((x) => ({ ...x, notify_on_approve: v }))} />
          </label>
        </div>
      </section>

      {!mailReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          עוד לא חובר מייל לשליחה. התזכורות וההתראות יוצאות מהמייל של העובד שהפיק את ההצעה (חיבור בדף{" "}
          <a href="/profile" className="font-bold underline">חתימה ופרופיל</a>), או ממייל העסק (חיבור בדף{" "}
          <a href="/business" className="font-bold underline">פרטי העסק</a>).
        </div>
      ) : null}

      <div className="no-print sticky bottom-20 z-20 lg:bottom-4">
        <div className="card flex items-center justify-between gap-3 p-3 shadow-lg">
          <span className={`text-sm font-semibold ${msg?.error ? "text-rose-600" : "text-emerald-700"}`}>{msg?.error ?? msg?.ok ?? ""}</span>
          <button className="btn-primary" onClick={save} disabled={pending}>
            <Save className="size-4" /> שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
