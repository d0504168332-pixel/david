import "server-only";
import { createHmac } from "crypto";
import { createAdminClient } from "./supabase/admin";
import { calcTotals } from "./quote";
import type { Business, Quote } from "./types";

/**
 * שליחת אירוע "הצעה אושרה" למערכת חיצונית (למשל מערכת ניהול ההסעות).
 * נשלח POST עם JSON, חתום ב-HMAC-SHA256 בכותרת X-QuoteCraft-Signature.
 */
export async function sendQuoteEvent(quoteId: string, event = "quote.approved") {
  const admin = createAdminClient();
  const { data: quote } = await admin.from("quotes").select("*").eq("id", quoteId).maybeSingle<Quote>();
  if (!quote) return { ok: false, error: "quote not found" };
  const { data: business } = await admin.from("businesses").select("*").eq("id", quote.business_id).maybeSingle<Business>();
  if (!business?.webhook_url) return { ok: false, skipped: true };

  const { data: author } = quote.created_by
    ? await admin.from("profiles").select("full_name,email,phone").eq("id", quote.created_by).maybeSingle()
    : { data: null };
  const t = calcTotals(quote);
  const payload = {
    event,
    sent_at: new Date().toISOString(),
    business: { id: business.id, name: business.name },
    quote: {
      id: quote.id,
      number: `${business.quote_prefix ?? ""}${quote.number ?? ""}`,
      title: quote.title,
      status: quote.status,
      issue_date: quote.issue_date,
      approved_by: quote.approved_by_name,
      approved_at: quote.approved_at,
      subtotal: Math.round(t.subtotal * 100) / 100,
      discount: Math.round(t.discount * 100) / 100,
      vat: Math.round(t.vat * 100) / 100,
      total: Math.round(t.total * 100) / 100,
      currency: "ILS",
      items: quote.items,
      notes: quote.notes,
    },
    client: {
      name: quote.client_name,
      contact: quote.client_contact,
      phone: quote.client_phone,
      email: quote.client_email,
      address: quote.client_address,
      tax_id: quote.client_tax_id,
    },
    trip: quote.meta?.trip ?? null,
    sales_rep: author ?? null,
  };
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", business.webhook_secret ?? "").update(body).digest("hex");

  let status: number | null = null;
  let text = "";
  let ok = false;
  try {
    const res = await fetch(business.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-quotecraft-event": event, "x-quotecraft-signature": sig },
      body,
      signal: AbortSignal.timeout(10000),
    });
    status = res.status;
    ok = res.ok;
    text = (await res.text()).slice(0, 500);
  } catch (e) {
    text = String((e as Error)?.message ?? e).slice(0, 500);
  }
  await admin.from("webhook_deliveries").insert({
    business_id: business.id,
    quote_id: quote.id,
    event,
    url: business.webhook_url,
    status_code: status,
    ok,
    response: text,
  });
  return { ok, status };
}
