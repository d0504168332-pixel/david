import { extractFreeItems } from "./parse-request";
import { findSimilar, sameClientHistory, type PastPrice } from "./price-check";
import { formatDate } from "./quote";
import type { Client, QuoteRequest } from "./types";

/** הופך בקשה של לקוח לטיוטת הצעה: פרטי לקוח, שורות, פרטי נסיעה ומחירים מוצעים מההיסטוריה */
export function draftFromRequest(r: QuoteRequest, clients: Client[], history: PastPrice[], prefix: string) {
  const em = r.client_email?.toLowerCase();
  const ph = r.client_phone?.replace(/\D/g, "");
  const match =
    (r.client_id && clients.find((c) => c.id === r.client_id)) ||
    (em && clients.find((c) => c.email?.toLowerCase() === em)) ||
    (ph && clients.find((c) => c.phone && c.phone.replace(/\D/g, "") === ph)) ||
    clients.find((c) => c.name.trim() === r.client_name.trim()) ||
    null;

  let rows: { description: string; details?: string; quantity: number }[] = (r.items ?? []).map((i) => ({ description: i.description, quantity: i.quantity }));
  const t = r.trip;
  if (t && (t.origin || t.destination)) {
    const details = [
      t.date && formatDate(t.date),
      t.time && `יציאה ${t.time}`,
      t.passengers && `${t.passengers} נוסעים`,
      t.round_trip ? `הלוך-חזור${t.return_time ? `, חזור ${t.return_time}` : ""}` : "כיוון אחד",
      t.stops && `עצירות: ${t.stops}`,
    ]
      .filter(Boolean)
      .join(" · ");
    // הפרטים המלאים מופיעים בטבלת "פרטי הנסיעה" במסמך — בשורה נשאר תקציר קצר
    void details;
    rows = [{ description: `הסעה${t.round_trip ? " הלוך-חזור" : ""} – ${t.passengers ? `${t.passengers} נוסעים` : "לפי הפרטים"}`, quantity: 1 }, ...rows];
  }
  if (!rows.length && r.request_text) rows = extractFreeItems(r.request_text);
  if (!rows.length) rows = [{ description: "", quantity: 1 }];

  const own = sameClientHistory(history, match?.id, match?.name ?? r.client_name);
  const priceSources: Record<string, string> = {};
  const items = rows.map((row) => {
    const id = Math.random().toString(36).slice(2, 10);
    const m = findSimilar(row.description, own)[0] ?? findSimilar(row.description, history)[0];
    if (m) priceSources[id] = `${prefix}${m.number ?? ""}`;
    return { id, description: row.description, details: row.details ?? "", quantity: row.quantity, unit_price: m ? m.unit_price : 0 };
  });

  const title = t?.destination ? `הסעה ל${t.destination}${t.date ? ` – ${formatDate(t.date)}` : ""}` : rows[0]?.description ?? "";
  return {
    initial: {
      client_id: match?.id ?? null,
      client_name: match?.name ?? r.client_name,
      client_contact: r.client_contact ?? match?.contact_name ?? "",
      client_phone: r.client_phone ?? match?.phone ?? "",
      client_email: r.client_email ?? match?.email ?? "",
      client_address: match?.address ?? "",
      client_tax_id: match?.tax_id ?? "",
      title,
      items,
      notes: "",
      meta: { trip: t ?? null },
      request_id: r.id,
    },
    priceSources,
    clientMatched: !!match,
  };
}
