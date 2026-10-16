// חישוב מחיר אוטומטי לנסיעה לפי המחירון של העסק
import type { Pricing, Trip, Vehicle } from "./types";

export const DEFAULT_PRICING: Required<Omit<Pricing, "vehicles">> & { vehicles: Vehicle[] } = {
  vehicles: [
    { id: "mini", name: "מיניבוס 20 מקומות", seats: 20, per_km: 7, min_price: 650, wait_hour: 90 },
    { id: "midi", name: "מידיבוס 35 מקומות", seats: 35, per_km: 9, min_price: 850, wait_hour: 110 },
    { id: "bus", name: "אוטובוס 50 מקומות", seats: 50, per_km: 11, min_price: 1100, wait_hour: 130 },
  ],
  night_pct: 25,
  night_from: "22:00",
  night_to: "06:00",
  weekend_pct: 50,
  friday_from: "15:00",
  free_wait_hours: 1,
  round_up: 10,
};

export function withDefaults(p: Pricing | null | undefined) {
  return { ...DEFAULT_PRICING, ...(p ?? {}), vehicles: p?.vehicles?.length ? p.vehicles : DEFAULT_PRICING.vehicles };
}

const toMin = (hhmm?: string) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function inWindow(t: number | null, from: number | null, to: number | null) {
  if (t == null || from == null || to == null) return false;
  return from <= to ? t >= from && t < to : t >= from || t < to; // חלון שחוצה חצות
}

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

export type PricePlan = {
  vehicle: Vehicle;
  count: number; // כמה רכבים
  perVehicle: number; // מחיר לרכב לנסיעה אחת (לתאריך אחד)
  total: number; // כל הרכבים, תאריך אחד
  lines: string[]; // פירוט החישוב
  label: string; // "2 × מיניבוס 20 מקומות"
};

/** מחיר לרכב אחד מסוג מסוים */
export function priceForVehicle(v: Vehicle, trip: Trip, pricing: Pricing | null | undefined) {
  const p = withDefaults(pricing);
  const lines: string[] = [];
  const km1 = Number(trip.distance_km) || 0;
  const km = trip.round_trip ? km1 * 2 : km1;
  const byKm = km * v.per_km;
  const base = Math.max(v.min_price, byKm);
  lines.push(
    byKm >= v.min_price
      ? `${Math.round(km)} ק״מ${trip.round_trip ? " (הלוך-חזור)" : ""} × ₪${v.per_km} = ${shekel(byKm)}`
      : `מחיר מינימום ${shekel(v.min_price)} (${Math.round(km)} ק״מ × ₪${v.per_km} = ${shekel(byKm)})`
  );

  // המתנה בין ההגעה ליעד לבין החזור
  let wait = 0;
  const dep = toMin(trip.time);
  const ret = toMin(trip.return_time);
  if (trip.round_trip && dep != null && ret != null) {
    const arrive = dep + (Number(trip.duration_min) || 0);
    let gap = ret - arrive;
    if (gap < 0) gap += 24 * 60;
    const billable = Math.max(0, gap / 60 - (p.free_wait_hours ?? 0));
    const hours = Math.ceil(billable * 2) / 2; // חצאי שעה
    if (hours > 0) {
      wait = hours * v.wait_hour;
      lines.push(`המתנה ${hours} שע׳ × ₪${v.wait_hour} = ${shekel(wait)}`);
    }
  }

  // תוספות
  let extra = 0;
  const nf = toMin(p.night_from);
  const nt = toMin(p.night_to);
  if (p.night_pct && (inWindow(dep, nf, nt) || (trip.round_trip && inWindow(ret, nf, nt)))) {
    const add = (base * p.night_pct) / 100;
    extra += add;
    lines.push(`תוספת לילה ${p.night_pct}% = ${shekel(add)}`);
  }
  if (p.weekend_pct && trip.date) {
    const day = new Date(trip.date + "T12:00:00").getDay(); // 5 = שישי, 6 = שבת
    const ff = toMin(p.friday_from);
    if (day === 6 || (day === 5 && dep != null && ff != null && dep >= ff)) {
      const add = (base * p.weekend_pct) / 100;
      extra += add;
      lines.push(`תוספת שבת ${p.weekend_pct}% = ${shekel(add)}`);
    }
  }

  let total = base + wait + extra;
  const r = Number(p.round_up) || 0;
  if (r > 0) total = Math.ceil(total / r) * r;
  return { total, lines };
}

/** כל האפשרויות להסיע את הנוסעים (סוג רכב × כמות), מהזולה ליקרה */
export function pricePlans(trip: Trip, pricing: Pricing | null | undefined): PricePlan[] {
  const p = withDefaults(pricing);
  const pax = Math.max(1, Number(trip.passengers) || 1);
  return p.vehicles
    .filter((v) => v.seats > 0)
    .map((v) => {
      const count = Math.ceil(pax / v.seats);
      const one = priceForVehicle(v, trip, p);
      return {
        vehicle: v,
        count,
        perVehicle: one.total,
        total: one.total * count,
        lines: one.lines,
        label: count > 1 ? `${count} × ${v.name}` : v.name,
      };
    })
    .filter((pl) => pl.count <= 6)
    .sort((a, b) => a.total - b.total || a.count - b.count);
}

/** תיאור שורת ההסעה בהצעה */
export function planDescription(plan: PricePlan, trip: Trip) {
  const route = [trip.origin, trip.destination].filter(Boolean).join(" ← ");
  return `הסעה${trip.round_trip ? " הלוך-חזור" : ""}${route ? ` ${route}` : ""} – ${plan.vehicle.name}`;
}
