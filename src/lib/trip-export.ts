import { calcTotals, formatDate, quoteNumber } from "./quote";
import type { Business, Quote } from "./types";

/** שדות הנסיעה בסדר קבוע — לייבוא למערכת ההסעות (YIT) או לאקסל */
export function tripRow(q: Quote, b: Pick<Business, "quote_prefix">) {
  const t = q.meta?.trip ?? {};
  const tot = calcTotals(q);
  return {
    "מספר הצעה": quoteNumber(b.quote_prefix, q.number),
    "תאריך נסיעה": t.date ? formatDate(t.date) : "",
    "שעת יציאה": t.time ?? "",
    "מוצא": t.origin ?? "",
    "יעד": t.destination ?? "",
    "עצירות": t.stops ?? "",
    "מספר נוסעים": t.passengers != null ? String(t.passengers) : "",
    "הלוך-חזור": t.round_trip ? "כן" : "לא",
    "שעת חזור": t.return_time ?? "",
    "לקוח": q.client_name,
    "איש קשר": q.client_contact ?? "",
    "טלפון": q.client_phone ?? "",
    "אימייל": q.client_email ?? "",
    "תיאור": q.items.map((i) => `${i.description}${i.quantity !== 1 ? ` ×${i.quantity}` : ""}`).join(" | "),
    "מחיר לפני מע\"מ": tot.afterDiscount.toFixed(2),
    "סה\"כ כולל מע\"מ": tot.total.toFixed(2),
    "אושר ע\"י": q.approved_by_name ?? "",
    "תאריך אישור": q.approved_at ? formatDate(q.approved_at) : "",
    "הערות": [q.notes].filter(Boolean).join(" "),
  };
}

const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV בקידוד UTF-8 עם BOM — נפתח נכון באקסל בעברית */
export function tripCsv(q: Quote, b: Pick<Business, "quote_prefix">) {
  const row = tripRow(q, b);
  const head = Object.keys(row).map(esc).join(",");
  const line = Object.values(row).map(esc).join(",");
  return "﻿" + head + "\r\n" + line + "\r\n";
}

export function tripEmailHtml(q: Quote, b: Pick<Business, "quote_prefix" | "name" | "primary_color">) {
  const row = tripRow(q, b);
  const rows = Object.entries(row)
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#78716c;white-space:nowrap">${k}</td><td style="padding:6px 10px;font-weight:600">${String(v).replace(/</g, "&lt;")}</td></tr>`)
    .join("");
  return `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px;color:#1c2230">
  <div style="background:${b.primary_color};color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-size:16px;font-weight:700">✓ הצעה ${row["מספר הצעה"]} אושרה — נסיעה חדשה לשיבוץ</div>
  <table style="border-collapse:collapse;width:100%;border:1px solid #e7e5e4;border-top:0">${rows}</table>
  <p style="color:#78716c;font-size:12px;margin-top:10px">מצורפים: קובץ YIT לייבוא ישיר, וקובץ CSV לאקסל. נשלח אוטומטית מ-${b.name} · QuoteCraft</p>
</div>`;
}
