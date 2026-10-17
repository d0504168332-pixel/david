"use client";

import { useMemo, useState, useTransition } from "react";
import { Bus, Calculator, Fuel, Percent, Plus, Route, Save, Trash2, UserRound, Wrench } from "lucide-react";
import { saveCalculator } from "@/app/actions/settings";
import { pricePlans, vehicleCost } from "@/lib/pricing";
import type { CostExtra, CostSettings, Pricing, Trip, Vehicle } from "@/lib/types";
import { Toggle } from "@/components/QuoteEditor";

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

function Num({ value, onChange, suffix, step = "any", disabled, w = "w-24" }: { value: number | undefined; onChange: (n: number) => void; suffix?: string; step?: string; disabled?: boolean; w?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" inputMode="decimal" min={0} step={step} disabled={disabled} className={`field ${w} tabular-nums`} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      {suffix ? <span className="shrink-0 text-sm text-stone-500">{suffix}</span> : null}
    </div>
  );
}

function Field({ icon, label, hint, children }: { icon?: React.ReactNode; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
        {icon}
        {label}
      </div>
      {children}
      {hint ? <div className="mt-1 text-xs text-stone-500">{hint}</div> : null}
    </div>
  );
}

export default function CalculatorForm({ initial, canEdit }: { initial: Pricing; canEdit: boolean }) {
  const [p, setPState] = useState<Pricing>(initial);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Pricing>) => {
    setPState((x) => ({ ...x, ...patch }));
    setDirty(true);
    setMsg(null);
  };
  const c: CostSettings = p.cost ?? {};
  const setC = (patch: Partial<CostSettings>) => set({ cost: { ...c, ...patch } });
  const vehicles = (p.vehicles ?? []).map((v) => ({ ...v, ...vehicleCost(v) }));
  const setV = (id: string, patch: Partial<Vehicle>) => set({ vehicles: vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  const extras = c.extras ?? [];
  const setX = (id: string, patch: Partial<CostExtra>) => setC({ extras: extras.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const isCost = p.mode === "cost";

  // נסיעת בדיקה — מראה מיד מה יוצא
  const [test, setTest] = useState<Trip>({ distance_km: 60, duration_min: 55, passengers: 45, round_trip: true, time: "08:00", return_time: "16:00", road6: false });
  const plans = useMemo(() => pricePlans(test, { ...p, mode: "cost" }), [p, test]);

  const save = () =>
    start(async () => {
      const r = await saveCalculator(p);
      setMsg(r ?? null);
      if (r?.ok) setDirty(false);
    });

  const dis = !canEdit;

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      {!canEdit ? <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">רק מנהל העסק יכול לעדכן את המחשבון. כאן אפשר לראות את הערכים.</div> : null}

      {/* מצב תמחור */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
              <Calculator className="size-5 text-brand" /> לחשב הצעות לפי המחשבון
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {isCost ? "פעיל: כל הצעה חדשה מחושבת לפי העלויות כאן + אחוז הרווח." : "כבוי: ההצעות מחושבות לפי המחירון הקבוע (₪ לק״מ). מדליקים כדי לעבור לחישוב לפי עלויות."}
            </p>
          </div>
          <Toggle checked={isCost} onChange={(v) => !dis && set({ mode: v ? "cost" : "km" })} />
        </div>
      </section>

      {/* עלויות כלליות */}
      <section className="card p-5">
        <h2 className="mb-4 text-[17px] font-extrabold">עלויות קבועות של החברה</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field icon={<Fuel className="size-4 text-brand" />} label="מחיר סולר" hint="מה שאתה משלם בפועל לליטר">
            <Num value={c.fuel_price} onChange={(n) => setC({ fuel_price: n })} suffix="₪ לליטר" disabled={dis} />
          </Field>
          <Field icon={<UserRound className="size-4 text-brand" />} label="נהג אוטובוס — עלות לשעה" hint="שכר + עלויות מעביד">
            <Num value={c.driver_hour} onChange={(n) => setC({ driver_hour: n })} suffix="₪ לשעה" disabled={dis} />
          </Field>
          <Field icon={<UserRound className="size-4 text-brand" />} label="נהג מיניבוס — עלות לשעה" hint="שכר + עלויות מעביד">
            <Num value={c.driver_hour_mini} onChange={(n) => setC({ driver_hour_mini: n })} suffix="₪ לשעה" disabled={dis} />
          </Field>
          <Field label="מינימום שעות נהג" hint="גם נסיעה קצרה תחושב לפחות לפי זה">
            <Num value={c.min_hours} onChange={(n) => setC({ min_hours: n })} suffix="שעות" disabled={dis} w="w-20" />
          </Field>
          <Field icon={<Route className="size-4 text-brand" />} label="ק״מ ריקים לכל נסיעה" hint="מהחניון לאיסוף ובחזרה">
            <Num value={c.empty_km} onChange={(n) => setC({ empty_km: n })} suffix="ק״מ" disabled={dis} w="w-20" />
          </Field>
          <Field icon={<Percent className="size-4 text-brand" />} label="אחוז רווח" hint="נוסף על סך העלויות">
            <Num value={c.profit_pct} onChange={(n) => setC({ profit_pct: n })} suffix="%" disabled={dis} w="w-20" />
          </Field>
        </div>
      </section>

      {/* לכל רכב */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
          <Bus className="size-5 text-brand" /> עלויות לפי סוג רכב
        </h2>
        <p className="mb-4 text-sm text-stone-500">סוגי הרכבים עצמם (שם ומקומות) מוגדרים בטאב המחירון.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => (
            <div key={v.id} className="rounded-xl border border-stone-200 p-3">
              <div className="mb-2 font-extrabold">
                {v.name} <span className="text-xs font-semibold text-stone-500">· {v.seats} מקומות</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                <label className="col-span-2 min-w-0">
                  <span className="text-xs font-semibold text-stone-500">מי נוהג ברכב</span>
                  <select className="field" value={v.driver} disabled={dis} onChange={(e) => setV(v.id, { driver: e.target.value as "bus" | "mini" })}>
                    <option value="bus">נהג אוטובוס (₪{c.driver_hour ?? 0} לשעה)</option>
                    <option value="mini">נהג מיניבוס (₪{c.driver_hour_mini ?? 0} לשעה)</option>
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="text-xs font-semibold text-stone-500">צריכת דלק</span>
                  <Num value={v.km_per_liter} onChange={(n) => setV(v.id, { km_per_liter: n })} suffix="ק״מ/ליטר" disabled={dis} w="w-20" />
                </label>
                <label className="min-w-0">
                  <span className="text-xs font-semibold text-stone-500">ביטוח וקבועות ליום</span>
                  <Num value={v.fixed_day} onChange={(n) => setV(v.id, { fixed_day: n })} suffix="₪" disabled={dis} w="w-20" />
                </label>
                <label className="min-w-0">
                  <span className="text-xs font-semibold text-stone-500">בלאי וטיפולים</span>
                  <Num value={v.maint_km} onChange={(n) => setV(v.id, { maint_km: n })} suffix="₪/ק״מ" disabled={dis} w="w-20" />
                </label>
                <label className="min-w-0">
                  <span className="text-xs font-semibold text-stone-500">כביש 6 (כיוון)</span>
                  <Num value={v.road6_toll} onChange={(n) => setV(v.id, { road6_toll: n })} suffix="₪" disabled={dis} w="w-20" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* הוצאות נלוות */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
          <Wrench className="size-5 text-brand" /> הוצאות נלוות
        </h2>
        <p className="mb-4 text-sm text-stone-500">כל הוצאה נוספת שיש לך על נסיעה: חניה, מלווה, ניקיון, עמלה… לפי נסיעה, לק״מ או לשעה.</p>
        <div className="space-y-2">
          {extras.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-2">
              <input className="field min-w-0 flex-1 basis-40" value={x.name} disabled={dis} onChange={(e) => setX(x.id, { name: e.target.value })} placeholder="שם ההוצאה" />
              <Num value={x.amount} onChange={(n) => setX(x.id, { amount: n })} suffix="₪" disabled={dis} w="w-24" />
              <select className="field w-32" value={x.per} disabled={dis} onChange={(e) => setX(x.id, { per: e.target.value as CostExtra["per"] })}>
                <option value="trip">לנסיעה</option>
                <option value="km">לק״מ</option>
                <option value="hour">לשעה</option>
              </select>
              {!dis ? (
                <button type="button" className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600" title="הסרה" onClick={() => setC({ extras: extras.filter((e) => e.id !== x.id) })}>
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {!dis ? (
          <button type="button" className="mt-2 flex items-center gap-1 text-sm font-bold text-brand" onClick={() => setC({ extras: [...extras, { id: `x${Date.now().toString(36)}`, name: "", amount: 0, per: "trip" }] })}>
            <Plus className="size-4" /> הוצאה
          </button>
        ) : null}
      </section>

      {/* נסיעת בדיקה */}
      <section className="card p-5">
        <h2 className="mb-1 text-[17px] font-extrabold">בדיקה: כמה תעלה נסיעה?</h2>
        <p className="mb-4 text-sm text-stone-500">משנים את הנתונים ורואים מיד את המחיר והפירוט לפי המחשבון.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="text-xs font-semibold text-stone-500">ק״מ (כיוון אחד)</span>
            <Num value={test.distance_km} onChange={(n) => setTest({ ...test, distance_km: n })} w="w-24" />
          </label>
          <label>
            <span className="text-xs font-semibold text-stone-500">דקות נסיעה</span>
            <Num value={test.duration_min} onChange={(n) => setTest({ ...test, duration_min: n })} w="w-24" />
          </label>
          <label>
            <span className="text-xs font-semibold text-stone-500">נוסעים</span>
            <Num value={test.passengers} onChange={(n) => setTest({ ...test, passengers: n })} w="w-20" step="1" />
          </label>
          <label className="flex h-10 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={!!test.round_trip} onChange={(e) => setTest({ ...test, round_trip: e.target.checked })} /> הלוך-חזור
          </label>
          {test.round_trip ? (
            <>
              <label>
                <span className="text-xs font-semibold text-stone-500">יציאה</span>
                <input type="time" className="field w-28" value={test.time ?? ""} onChange={(e) => setTest({ ...test, time: e.target.value })} />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">חזור</span>
                <input type="time" className="field w-28" value={test.return_time ?? ""} onChange={(e) => setTest({ ...test, return_time: e.target.value })} />
              </label>
            </>
          ) : null}
          <label className="flex h-10 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={!!test.road6} onChange={(e) => setTest({ ...test, road6: e.target.checked })} /> כביש 6
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((pl) => (
            <div key={pl.vehicle.id} className="rounded-xl border border-stone-200 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 font-bold">{pl.label}</span>
                <span className="text-lg font-extrabold tabular-nums">{shekel(pl.total)}</span>
              </div>
              <ul className="mt-2 space-y-0.5 border-t border-stone-100 pt-2 text-xs text-stone-600">
                {pl.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
                {pl.count > 1 ? <li className="font-semibold">× {pl.count} רכבים</li> : null}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-500">תוספות לילה/שבת ועיגול המחיר — לפי ההגדרות בטאב המחירון.</p>
      </section>

      {canEdit ? (
        <div className="sticky bottom-20 z-20 lg:bottom-4">
          <div className="card flex flex-wrap items-center gap-3 p-3 shadow-lg">
            <div className="min-w-0 flex-1 text-sm">
              {msg?.error ? <span className="font-semibold text-rose-600">{msg.error}</span> : msg?.ok ? <span className="font-semibold text-emerald-700">{msg.ok}</span> : dirty ? <span className="text-stone-600">יש שינויים שלא נשמרו</span> : <span className="text-stone-500">כל השינויים שמורים</span>}
            </div>
            <button className="btn-primary shrink-0" disabled={pending || !dirty} onClick={save}>
              {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="size-4" />}
              שמירה
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
