import type { Quote, QuoteItem, QuoteStatus } from "./types";

export function calcTotals(q: {
  items: QuoteItem[];
  discount_type: "percent" | "amount";
  discount_value: number;
  vat_enabled: boolean;
  vat_rate: number;
}) {
  const subtotal = q.items.reduce(
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
>;
