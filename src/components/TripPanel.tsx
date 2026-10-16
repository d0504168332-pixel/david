"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, CalendarPlus, MapPin, Repeat, Sparkles, X, Layers } from "lucide-react";
import { pricePlans, type PricePlan } from "@/lib/pricing";
import { addDays, formatDate, tripDates } from "@/lib/quote";
import type { Pricing, Trip } from "@/lib/types";

type Props = {
  trip: Trip;
  onChange: (t: Trip) => void;
  pricing: Pricing | null | undefined;
  onApplyPlan: (plan: PricePlan) => void;
  onApplyOptions: (plans: PricePlan[]) => void;
  canEditPricing: boolean;
};

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

export default function TripPanel({ trip, onChange, pricing, onApplyPlan, onApplyOptions, canEditPricing }: Props) {
  const set = (patch: Partial<Trip>) => onChange({ ...trip, ...patch });
  const [busy, setBusy] = useState(false);
  const [distErr, setDistErr] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [open, setOpen] = useState<string | null>(null);

  const dates = tripDates(trip);
  const plans = useMemo(() => (trip.distance_km ? pricePlans(trip, pricing) : []), [trip, pricing]);

  const calcDistance = async () => {
    if (!trip.origin || !trip.destination) return setDistErr("נא למלא נקודת יציאה ויעד");
    setBusy(true);
    setDistErr(null);
    try {
      const r = await fetch(`/api/distance?from=${encodeURIComponent(trip.origin)}&to=${encodeURIComponent(trip.destination)}`);
      const j = await r.json();
      if (!r.ok || !j.km) setDistErr(j.error ?? "חישוב המרחק נכשל");
      else set({ distance_km: j.km, duration_min: j.minutes });
    } catch {
      setDistErr("חישוב המרחק נכשל, אפשר להקליד ק״מ ידנית");
    } finally {
      setBusy(false);
    }
  };

  // בקשה שהגיעה עם מוצא ויעד: מחשבים מרחק אוטומטית פעם אחת
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current) return;
    auto.current = true;
    if (trip.origin && trip.destination && !trip.distance_km) void calcDistance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addExtra = (list: string[]) => {
    const all = [...new Set([...(trip.extra_dates ?? []), ...list])].filter((d) => d && d !== trip.date).sort();
    set({ extra_dates: all });
  };

  const input = (k: keyof Trip, label: string, type = "text") => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="field"
        value={(trip[k] as string | number | undefined) ?? ""}
        onChange={(e) => set({ [k]: type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value } as Partial<Trip>)}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {input("origin", "נקודת יציאה")}
        {input("destination", "יעד")}
        {input("date", "תאריך", "date")}
        {input("time", "שעת יציאה", "time")}
        {input("passengers", "מספר נוסעים", "number")}
        {input("stops", "עצירות")}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={!!trip.round_trip} onChange={(e) => set({ round_trip: e.target.checked })} />
          הלוך-חזור
        </label>
        {trip.round_trip ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500">שעת חזור</span>
            <input type="time" className="field w-32" value={trip.return_time ?? ""} onChange={(e) => set({ return_time: e.target.value })} />
          </div>
        ) : null}
      </div>

      {/* מרחק */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <button type="button" className="btn-ghost" onClick={calcDistance} disabled={busy}>
            {busy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <MapPin className="size-4" />}
            חישוב מרחק אוטומטי
          </button>
          <div className="w-28">
            <label className="text-[11.5px] font-semibold text-stone-500">ק״מ (כיוון אחד)</label>
            <input type="number" min={0} step="any" className="field" value={trip.distance_km ?? ""} onChange={(e) => set({ distance_km: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div className="w-28">
            <label className="text-[11.5px] font-semibold text-stone-500">דקות נסיעה</label>
            <input type="number" min={0} className="field" value={trip.duration_min ?? ""} onChange={(e) => set({ duration_min: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>
        {distErr ? <div className="mt-2 text-sm font-semibold text-rose-600">{distErr}</div> : null}
      </div>

      {/* תאריכים נוספים */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-700">
          <Repeat className="size-4" /> נסיעה חוזרת (כמה תאריכים בהצעה אחת)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="field w-44" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" className="btn-ghost" disabled={!newDate} onClick={() => { addExtra([newDate]); setNewDate(""); }}>
            <CalendarPlus className="size-4" /> הוספת תאריך
          </button>
          <span className="text-sm text-stone-400">או</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-stone-600">כל שבוע ×</span>
            <input type="number" min={2} max={52} className="field w-16" value={weeks} onChange={(e) => setWeeks(Math.max(2, Math.min(52, e.target.valueAsNumber || 2)))} />
            <button
              type="button"
              className="btn-ghost"
              disabled={!trip.date}
              title={!trip.date ? "קודם בוחרים תאריך ראשון" : ""}
              onClick={() => addExtra(Array.from({ length: weeks - 1 }, (_, k) => addDays(trip.date!, 7 * (k + 1))))}
            >
              יצירה
            </button>
          </div>
        </div>
        {dates.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dates.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                {formatDate(d)}
                {d !== trip.date ? (
                  <button type="button" aria-label="הסרה" onClick={() => set({ extra_dates: (trip.extra_dates ?? []).filter((x) => x !== d) })}>
                    <X className="size-3" />
                  </button>
                ) : null}
              </span>
            ))}
            <button type="button" className="text-xs font-semibold text-stone-500 underline" onClick={() => set({ extra_dates: [] })}>
              ניקוי
            </button>
          </div>
        ) : null}
      </div>

      {/* מחיר אוטומטי */}
      <div className="rounded-xl border border-brand/25 bg-brand/[0.04] p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
          <Calculator className="size-4" /> מחיר אוטומטי לפי המחירון
          {dates.length > 1 ? <span className="text-xs font-semibold text-stone-500">· {dates.length} תאריכים</span> : null}
        </div>
        {!trip.distance_km ? (
          <p className="text-sm text-stone-500">מחשבים מרחק (או מקלידים ק״מ), והמערכת תציע מחיר לכל סוג רכב.</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {plans.map((pl, i) => (
                <li key={pl.vehicle.id} className="rounded-lg bg-white p-2 ring-1 ring-stone-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="min-w-0 flex-1 text-right" onClick={() => setOpen(open === pl.vehicle.id ? null : pl.vehicle.id)}>
                      <span className="font-bold">{pl.label}</span>
                      {i === 0 ? <span className="ms-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">הכי משתלם</span> : null}
                      <span className="block text-xs text-stone-500">
                        {shekel(pl.perVehicle)} לרכב{dates.length > 1 ? ` · ${shekel(pl.total * dates.length)} ל-${dates.length} תאריכים` : ""} · פירוט
                      </span>
                    </button>
                    <span className="font-extrabold tabular-nums">{shekel(pl.total)}</span>
                    <button type="button" className="btn-primary h-8 px-3 text-sm" onClick={() => onApplyPlan(pl)}>
                      החלה
                    </button>
                  </div>
                  {open === pl.vehicle.id ? (
                    <ul className="mt-1.5 space-y-0.5 border-t border-stone-100 pt-1.5 text-xs text-stone-600">
                      {pl.lines.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                      {pl.count > 1 ? <li>× {pl.count} רכבים</li> : null}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            {plans.length >= 2 ? (
              <button type="button" className="btn-ghost mt-2 w-full" onClick={() => onApplyOptions(plans.slice(0, 3))}>
                <Layers className="size-4" /> להציע ללקוח {Math.min(3, plans.length)} אפשרויות לבחירה
              </button>
            ) : null}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
              <Sparkles className="size-3.5" />
              המחיר נכנס להצעה וניתן לשינוי.{" "}
              {canEditPricing ? (
                <a href="/automation" className="font-semibold underline" target="_blank">
                  עריכת המחירון
                </a>
              ) : null}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
