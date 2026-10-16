import type { Quote, QuoteItem, QuoteMeta, QuoteStatus, Trip } from "./types";

type Totalable = {
  items: QuoteItem[];
  discount_type: "percent" | "amount";
  discount_value: number;
  vat_enabled: boolean;
  vat_rate: number;
  meta?: QuoteMeta | null;
};

/** יש בהצעה כמה אפשרויות לבחירה? */
export function hasOptions(meta: QuoteMeta | null | undefined) {
  return (meta?.options?.length ?? 0) >= 2;
}

/** האפשרות שקובעת את הסכום: זו שהלקוח בחר, אחרת הראשונה */
export function activeOptionId(meta: QuoteMeta | null | undefined) {
  if (!hasOptions(meta)) return null;
  const ids = meta!.options!.map((o) => o.id);
  return meta!.chosen_option && ids.includes(meta!.chosen_option) ? meta!.chosen_option : ids[0];
}

/** הפריטים של אפשרות מסוימת: פריטים משותפים + הפריטים שלה */
export function itemsFor(q: { items: QuoteItem[]; meta?: QuoteMeta | null }, optionId?: string | null) {
  if (!hasOptions(q.meta)) return q.items;
  const ids = q.meta!.options!.map((o) => o.id);
  const opt = optionId ?? activeOptionId(q.meta);
  return q.items.filter((it) => !it.option || !ids.includes(it.option) || it.option === opt);
}

export function calcTotals(q: Totalable, optionId?: string | null) {
  const items = itemsFor(q, optionId);
  const subtotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
  const dv = Number(q.discount_value) || 0;
  const discount =
    q.discount_type === "percent" ? (subtotal * Math.min(dv, 100)) / 100 : Math.min(dv, subtotal);
  const afterDiscount = subtotal - discount;
  const vat = q.vat_enabled ? (afterDiscount * (Number(q.vat_rate) || 0)) / 100 : 0;
  const total = afterDiscount + vat;
  return { subtotal, discount, afterDiscount, vat, total };
}

/** כל תאריכי הנסיעה (ראשי + נוספים), ממוינים וללא כפילויות */
export function tripDates(t: Trip | null | undefined) {
  if (!t) return [] as string[];
  const all = [t.date, ...(t.extra_dates ?? [])].filter((d): d is string => !!d);
  return [...new Set(all)].sort();
}

export function money(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "";
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function quoteNumber(prefix: string | null | undefined, n: number | null | undefined) {
  if (!n) return "טיוטה";
  return `${prefix ?? ""}${n}`;
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "טיוטה",
  sent: "נשלחה",
  approved: "אושרה",
  rejected: "נדחתה",
};

export const STATUS_CLASS: Record<QuoteStatus, string> = {
  draft: "bg-stone-100 text-stone-700 ring-stone-200",
  sent: "bg-sky-50 text-sky-700 ring-sky-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function newItem(): QuoteItem {
  return {
    id: Math.random().toString(36).slice(2, 10),
    description: "",
    details: "",
    quantity: 1,
    unit_price: 0,
  };
}

export function toIntlPhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) return p.slice(1);
  if (p.startsWith("00")) return p.slice(2);
  if (p.startsWith("0")) return "972" + p.slice(1);
  return p;
}

export function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export type QuoteForDoc = Pick<
  Quote,
  | "number"
  | "title"
  | "client_name"
  | "client_contact"
  | "client_phone"
  | "client_email"
  | "client_address"
  | "client_tax_id"
  | "issue_date"
  | "valid_until"
  | "items"
  | "discount_type"
  | "discount_value"
  | "vat_enabled"
  | "vat_rate"
  | "notes"
  | "terms"
  | "status"
  | "approved_by_name"
  | "approved_at"
> & { meta?: import("./types").QuoteMeta | null };
