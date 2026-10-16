// ניקוי ואימות של הגדרות המחירון והמחשבון לפני שמירה
import type { CostExtra, Pricing, Vehicle } from "./types";

const num = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};
const opt = (v: unknown, min: number, max: number) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};
const hhmm = (v: unknown, dflt: string) => (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v : dflt);

export function cleanPricing(p: Pricing): Pricing | { error: string } {
  const vehicles: Vehicle[] = (p.vehicles ?? [])
    .filter((v) => v && String(v.name ?? "").trim())
    .slice(0, 12)
    .map((v, i) => ({
      id: String(v.id || `v${i}`).slice(0, 40),
      name: String(v.name).trim().slice(0, 60),
      seats: Math.round(num(v.seats, 1, 100, 50)),
      per_km: num(v.per_km, 0, 1000, 0),
      min_price: num(v.min_price, 0, 100000, 0),
      wait_hour: num(v.wait_hour, 0, 10000, 0),
      km_per_liter: opt(v.km_per_liter, 0.5, 50),
      fixed_day: opt(v.fixed_day, 0, 100000),
      maint_km: opt(v.maint_km, 0, 100),
      road6_toll: opt(v.road6_toll, 0, 5000),
    }));
  if (!vehicles.length) return { error: "נא להגדיר לפחות סוג רכב אחד" };
  const c = p.cost ?? {};
  const extras: CostExtra[] = (c.extras ?? [])
    .filter((x) => x && String(x.name ?? "").trim())
    .slice(0, 20)
    .map((x, i) => ({
      id: String(x.id || `x${i}`).slice(0, 40),
      name: String(x.name).trim().slice(0, 60),
      amount: num(x.amount, 0, 100000, 0),
      per: x.per === "km" || x.per === "hour" ? x.per : "trip",
    }));
  return {
    mode: p.mode === "cost" ? "cost" : "km",
    cost: {
      fuel_price: num(c.fuel_price, 0, 100, 7.5),
      driver_hour: num(c.driver_hour, 0, 2000, 75),
      min_hours: num(c.min_hours, 0, 24, 0),
      empty_km: num(c.empty_km, 0, 1000, 0),
      profit_pct: num(c.profit_pct, 0, 500, 0),
      extras,
    },
    vehicles,
    night_pct: num(p.night_pct, 0, 300, 0),
    night_from: hhmm(p.night_from, "22:00"),
    night_to: hhmm(p.night_to, "06:00"),
    weekend_pct: num(p.weekend_pct, 0, 300, 0),
    friday_from: hhmm(p.friday_from, "15:00"),
    free_wait_hours: num(p.free_wait_hours, 0, 24, 0),
    round_up: num(p.round_up, 0, 1000, 0),
  };
}
