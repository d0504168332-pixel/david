"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcTotals } from "@/lib/quote";
import { onQuoteApproved } from "@/lib/approval";
import type { QuoteItem, QuoteMeta, QuoteStatus } from "@/lib/types";

export type QuoteInput = {
  id?: string;
  client_id: string | null;
  save_client: boolean;
  title: string;
  client_name: string;
  client_contact: string;
  client_phone: string;
  client_email: string;
  client_address: string;
  client_tax_id: string;
  issue_date: string;
  valid_until: string | null;
  status: QuoteStatus;
  items: QuoteItem[];
  discount_type: "percent" | "amount";
  discount_value: number;
  vat_enabled: boolean;
  vat_rate: number;
  notes: string;
  terms: string;
  meta?: QuoteMeta;
  request_id?: string | null;
};

function clean(s: string | null | undefined) {
  const v = (s ?? "").trim();
  return v.length ? v : null;
}

export async function saveQuote(input: QuoteInput): Promise<{ id?: string; error?: string }> {
  const { supabase, profile, business } = await requireBusiness();
  if (!input.client_name?.trim()) return { error: "נא למלא שם לקוח" };

  const items = (input.items ?? [])
    .filter((it) => it.description?.trim() || Number(it.unit_price) > 0)
    .map((it) => ({
      id: it.id,
      description: it.description.trim(),
      details: (it.details ?? "").trim(),
      quantity: Number(it.quantity) || 0,
      unit_price: Number(it.unit_price) || 0,
    }));
  if (items.length === 0) return { error: "נא להוסיף לפחות פריט אחד" };

  let client_id = input.client_id || null;
  if (!client_id && input.save_client) {
    const { data: c, error: cErr } = await supabase
      .from("clients")
      .insert({
        business_id: business.id,
        created_by: profile.id,
        name: input.client_name.trim(),
        contact_name: clean(input.client_contact),
        phone: clean(input.client_phone),
        email: clean(input.client_email),
        address: clean(input.client_address),
        tax_id: clean(input.client_tax_id),
      })
      .select("id")
      .single();
    if (cErr) return { error: "שמירת הלקוח נכשלה: " + cErr.message };
    client_id = c.id;
  }

  const totals = calcTotals({ ...input, items });
  const row = {
    business_id: business.id,
    client_id,
    title: clean(input.title),
    client_name: input.client_name.trim(),
    client_contact: clean(input.client_contact),
    client_phone: clean(input.client_phone),
    client_email: clean(input.client_email),
    client_address: clean(input.client_address),
    client_tax_id: clean(input.client_tax_id),
    issue_date: input.issue_date,
    valid_until: input.valid_until || null,
    status: input.status,
    items,
    discount_type: input.discount_type,
    discount_value: Number(input.discount_value) || 0,
    vat_enabled: !!input.vat_enabled,
    vat_rate: Number(input.vat_rate) || 0,
    subtotal: totals.subtotal,
    total: totals.total,
    notes: clean(input.notes),
    terms: clean(input.terms),
    meta: input.meta ?? {},
  };

  if (input.id) {
    const { data: before } = await supabase.from("quotes").select("status").eq("id", input.id).maybeSingle();
    const { error } = await supabase.from("quotes").update(row).eq("id", input.id);
    if (!error && input.status === "approved" && before?.status !== "approved") await onQuoteApproved(input.id);
    if (error) return { error: "השמירה נכשלה: " + error.message };
    revalidatePath("/quotes");
    return { id: input.id };
  }
  const { data, error } = await supabase
    .from("quotes")
    .insert({ ...row, created_by: profile.id, request_id: input.request_id || null })
    .select("id")
    .single();
  if (error) return { error: "השמירה נכשלה: " + error.message };
  if (input.request_id) {
    await supabase.from("quote_requests").update({ status: "quoted", quote_id: data.id }).eq("id", input.request_id);
    revalidatePath("/requests");
  }
  if (input.status === "approved") await onQuoteApproved(data.id);
  revalidatePath("/quotes");
  return { id: data.id };
}

export async function setQuoteStatus(id: string, status: QuoteStatus) {
  const { supabase } = await requireBusiness();
  const patch: Record<string, unknown> = { status };
  if (status !== "approved") {
    patch.approved_by_name = null;
    patch.approved_at = null;
  }
  const { data: before } = await supabase.from("quotes").select("status").eq("id", id).maybeSingle();
  await supabase.from("quotes").update(patch).eq("id", id);
  if (status === "approved" && before?.status !== "approved") await onQuoteApproved(id);
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
}

/** שליחה חוזרת ידנית למערכת החיצונית */
export async function resendWebhook(id: string) {
  await requireBusiness();
  await onQuoteApproved(id);
  revalidatePath(`/quotes/${id}`);
  return { ok: true };
}

export async function markSent(id: string) {
  const { supabase } = await requireBusiness();
  await supabase.from("quotes").update({ status: "sent" }).eq("id", id).eq("status", "draft");
  revalidatePath(`/quotes/${id}`);
}

export async function deleteQuote(id: string) {
  const { supabase } = await requireBusiness();
  await supabase.from("quotes").delete().eq("id", id);
  revalidatePath("/quotes");
  redirect("/quotes");
}

export async function duplicateQuote(id: string) {
  const { supabase, profile } = await requireBusiness();
  const { data: q } = await supabase.from("quotes").select("*").eq("id", id).single();
  if (!q) redirect("/quotes");
  const {
    id: _id,
    number: _n,
    share_token: _t,
    created_at: _c,
    updated_at: _u,
    approved_at: _a,
    approved_by_name: _ab,
    request_id: _r,
    ...rest
  } = q;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("quotes")
    .insert({ ...rest, status: "draft", created_by: profile.id, issue_date: today })
    .select("id")
    .single();
  if (error || !data) redirect(`/quotes/${id}`);
  revalidatePath("/quotes");
  redirect(`/quotes/${data.id}/edit`);
}

/** אישור הצעה ע"י הלקוח מהקישור הציבורי */
export async function approveByToken(token: string, name: string): Promise<{ ok?: boolean; error?: string }> {
  const n = name.trim();
  if (n.length < 2) return { error: "נא להקליד שם מלא" };
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("id,status").eq("share_token", token).maybeSingle();
  if (!q) return { error: "ההצעה לא נמצאה" };
  if (q.status === "approved") return { ok: true };
  const { error } = await admin
    .from("quotes")
    .update({ status: "approved", approved_by_name: n.slice(0, 80), approved_at: new Date().toISOString() })
    .eq("id", q.id);
  if (error) return { error: "האישור נכשל, נסו שוב" };
  await onQuoteApproved(q.id);
  revalidatePath(`/q/${token}`);
  return { ok: true };
}
