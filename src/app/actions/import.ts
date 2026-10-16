"use server";

import { requireBusiness } from "@/lib/auth";
import { loadPriceHistory } from "@/lib/doc-data";
import { parseRequestHeuristic, type ParsedRequest } from "@/lib/parse-request";
import { parseWithAI } from "@/lib/ai-parse";
import { findSimilar, sameClientHistory } from "@/lib/price-check";
import type { Client, QuoteItem } from "@/lib/types";
import { extractTrip } from "@/lib/trip-parse";

export type ImportResult = {
  error?: string;
  engine?: "ai" | "basic";
  client_id?: string | null;
  draft?: Omit<ParsedRequest, "items"> & { items: (QuoteItem & { price_source?: string })[] };
};

export async function parseEmailRequest(text: string): Promise<ImportResult> {
  const { supabase, business } = await requireBusiness();
  if (!text || text.trim().length < 10) return { error: "הדביקו את תוכן המייל" };

  const ai = await parseWithAI(text);
  const parsed = ai ?? parseRequestHeuristic(text);
  const transport = business.business_type === "transport";
  const trip = transport ? (ai?.trip && (ai.trip.origin || ai.trip.destination) ? ai.trip : extractTrip(text)) : null;
  if (parsed.items.length === 0 && !trip) parsed.items.push({ description: parsed.title || "", quantity: 1 });
  if (parsed.items.length === 0) parsed.items.push({ description: "", quantity: 1 });

  // התאמה ללקוח שמור (לפי מייל, ואז לפי שם)
  const { data: clients } = await supabase.from("clients").select("*").eq("business_id", business.id).returns<Client[]>();
  const em = parsed.client_email.toLowerCase();
  const match =
    (em && clients?.find((c) => c.email?.toLowerCase() === em)) ||
    (parsed.client_name && clients?.find((c) => c.name.trim() === parsed.client_name.trim())) ||
    null;

  // מחיר מוצע מהיסטוריית ההצעות
  const history = await loadPriceHistory(supabase, business.id);
  // מחיר מוצע: קודם ממה שהוצע לאותו לקוח, אחרת מכל ההיסטוריה של העסק
  const own = sameClientHistory(history, match?.id, match?.name ?? parsed.client_name);
  const items = parsed.items.map((it) => {
    const m = findSimilar(it.description, own)[0] ?? findSimilar(it.description, history)[0];
    return {
      id: Math.random().toString(36).slice(2, 10),
      description: it.description,
      details: it.details ?? "",
      quantity: it.quantity,
      unit_price: m ? m.unit_price : 0,
      price_source: m ? `${business.quote_prefix ?? ""}${m.number ?? ""}` : undefined,
    };
  });

  return {
    engine: ai ? "ai" : "basic",
    client_id: match ? match.id : null,
    draft: {
      ...parsed,
      client_name: match?.name ?? parsed.client_name,
      client_contact: parsed.client_contact || match?.contact_name || "",
      client_phone: parsed.client_phone || match?.phone || "",
      client_email: parsed.client_email || match?.email || "",
      client_address: parsed.client_address || match?.address || "",
      items,
      trip,
    },
  };
}
