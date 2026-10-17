// חישוב מחיר אוטומטי לנסיעה לפי המחירון של העסק
import type { CostSettings, Pricing, Trip, Vehicle } from "./types";

/** ערכי פתיחה למחשבון העלויות — דוגמה בלבד, כל חברה מעדכנת לפי העלויות שלה */
export const DEFAULT_COST: Required<CostSettings> = {
  fuel_price: 7.5,
  driver_hour: 75,
  driver_hour_mini: 65,
  min_hours: 3,
  empty_km: 0,
  profit_pct: 20,
  extras: [],
};

const VEHICLE_COST: Record<string, Pick<Vehicle, "km_per_liter" | "fixed_day" | "maint_km" | "road6_toll">> = {
  mini: { km_per_liter: 6, fixed_day: 250, maint_km: 0.6, road6_toll: 45 },
  midi: { km_per_liter: 4.5, fixed_day: 320, maint_km: 0.8, road6_toll: 70 },
  bus: { km_per_liter: 3.3, fixed_day: 420, maint_km: 1, road6_toll: 90 },
};

export const DEFAULT_PRICING: Required<Omit<Pricing, "vehicles" | "cost" | "mode">> & { vehicles: Vehicle[]; cost: Required<CostSettings>; mode: "km" | "cost" } = {
  mode: "km",
  cost: DEFAULT_COST,
  vehicles: [
    { id: "mini", name: "מיניבוס 20 מקומות", seats: 20, per_km: 7, min_price: 650, wait_hour: 90, ...VEHICLE_COST.mini },
    { id: "midi", name: "מידיבוס 35 מקומות", seats: 35, per_km: 9, min_price: 850, wait_hour: 110, ...VEHICLE_COST.midi },
    { id: "bus", name: "אוטובוס 50 מקומות", seats: 50, per_km: 11, min_price: 1100, wait_hour: 130, ...VEHICLE_COST.bus },
  ],
  night_pct: 25,
  night_from: "22:00",
  night_to: "06:00",
  weekend_pct: 50,
  friday_from: "15:00",
  free_wait_hours: 1,
  round_up: 10,
};

/** ערכי עלות לרכב — מה שהוגדר, ואם חסר: לפי גודל הרכב */
export function vehicleCost(v: Vehicle) {
  const guess = v.seats <= 24 ? VEHICLE_COST.mini : v.seats <= 40 ? VEHICLE_COST.midi : VEHICLE_COST.bus;
  return {
    km_per_liter: v.km_per_liter ?? guess.km_per_liter!,
    fixed_day: v.fixed_day ?? guess.fixed_day!,
    maint_km: v.maint_km ?? guess.maint_km!,
    road6_toll: v.road6_toll ?? guess.road6_toll!,
    driver: v.driver ?? (v.seats <= 24 ? ("mini" as const) : ("bus" as const)),
  };
}

export function withDefaults(p: Pricing | null | undefined) {
  return {
    ...DEFAULT_PRICING,
    ...(p ?? {}),
    mode: p?.mode === "cost" ? ("cost" as const) : ("km" as const),
    cost: { ...DEFAULT_COST, ...(p?.cost ?? {}), extras: p?.cost?.extras ?? [] },
    vehicles: p?.vehicles?.length ? p.vehicles : DEFAULT_PRICING.vehicles,
  };
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
  const legs = trip.round_trip ? 2 : 1;
  const dep = toMin(trip.time);
  const ret = toMin(trip.return_time);
  const driveMin1 = Number(trip.duration_min) || Math.round(km1); // בלי זמן — מעריכים 60 קמ"ש

  // שעות המתנה בין ההגעה ליעד לבין החזור
  let gapHours = 0;
  if (trip.round_trip && dep != null && ret != null) {
    let gap = ret - (dep + driveMin1);
    if (gap < 0) gap += 24 * 60;
    gapHours = gap / 60;
  }

  let base: number;
  let wait = 0;
  if (p.mode === "cost") {
    // ---- לפי מחשבון העלויות ----
    const c = p.cost;
    const vc = vehicleCost(v);
    const allKm = km + (Number(c.empty_km) || 0);
    const fuel = vc.km_per_liter > 0 ? (allKm / vc.km_per_liter) * (c.fuel_price || 0) : 0;
    const hours = Math.max(Number(c.min_hours) || 0, Math.ceil(((driveMin1 * legs) / 60 + gapHours) * 2) / 2);
    const isMini = vc.driver === "mini";
    const rate = isMini ? (c.driver_hour_mini ?? c.driver_hour ?? 0) : c.driver_hour || 0;
    const driver = hours * rate;
    const wear = allKm * vc.maint_km;
    const road6 = trip.road6 ? legs * vc.road6_toll : 0;
    let extras = 0;
    const kmTxt = `${Math.round(allKm)} ק״מ${trip.round_trip ? " (הלוך-חזור)" : ""}${c.empty_km ? ` כולל ${c.empty_km} ריקים` : ""}`;
    lines.push(`דלק: ${kmTxt} ÷ ${vc.km_per_liter} ק״מ לליטר × ₪${c.fuel_price} = ${shekel(fuel)}`);
    lines.push(`${isMini ? "נהג מיניבוס" : "נהג אוטובוס"}: ${hours} שע׳ × ₪${rate} = ${shekel(driver)}`);
    if (vc.fixed_day) lines.push(`ביטוח וקבועות לרכב = ${shekel(vc.fixed_day)}`);
    if (wear) lines.push(`בלאי וטיפולים: ${Math.round(allKm)} ק״מ × ₪${vc.maint_km} = ${shekel(wear)}`);
    if (road6) lines.push(`כביש 6: ${legs} × ₪${vc.road6_toll} = ${shekel(road6)}`);
    for (const x of c.extras ?? []) {
      const amt = x.per === "km" ? x.amount * allKm : x.per === "hour" ? x.amount * hours : x.amount;
      if (!amt) continue;
      extras += amt;
      lines.push(`${x.name} = ${shekel(amt)}`);
    }
    const cost = fuel + driver + vc.fixed_day + wear + road6 + extras;
    const profit = (cost * (Number(c.profit_pct) || 0)) / 100;
    lines.push(`סה״כ עלות ${shekel(cost)} · רווח ${c.profit_pct}% = ${shekel(profit)}`);
    base = cost + profit;
    if (v.min_price && base < v.min_price) {
      lines.push(`מחיר מינימום לרכב ${shekel(v.min_price)}`);
      base = v.min_price;
    }
  } else {
    // ---- לפי מחירון ק"מ ----
    const byKm = km * v.per_km;
    base = Math.max(v.min_price, byKm);
    lines.push(
      byKm >= v.min_price
        ? `${Math.round(km)} ק״מ${trip.round_trip ? " (הלוך-חזור)" : ""} × ₪${v.per_km} = ${shekel(byKm)}`
        : `מחיר מינימום ${shekel(v.min_price)} (${Math.round(km)} ק״מ × ₪${v.per_km} = ${shekel(byKm)})`
    );
    const billable = Math.max(0, gapHours - (p.free_wait_hours ?? 0));
    const hours = Math.ceil(billable * 2) / 2; // חצאי שעה
    if (hours > 0) {
      wait = hours * v.wait_hour;
      lines.push(`המתנה ${hours} שע׳ × ₪${v.wait_hour} = ${shekel(wait)}`);
    }
    if (trip.road6) {
      const toll = legs * vehicleCost(v).road6_toll;
      wait += toll;
      lines.push(`כביש 6: ${legs} × ₪${vehicleCost(v).road6_toll} = ${shekel(toll)}`);
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
  return `הסעה${trip.round_trip ? " הלוך-חזור" : ""}${route ? ` ${route}` : ""} – ${plan.vehicle.name}${trip.road6 ? " (כולל כביש 6)" : ""}`;
}
