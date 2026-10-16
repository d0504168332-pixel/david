"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { calcTotals, hasOptions } from "@/lib/quote";
import { onQuoteApproved } from "@/lib/approval";
import { notifyOwner } from "@/lib/notify";
import { getSession } from "@/lib/auth";
import type { Quote, QuoteItem, QuoteMeta, QuoteStatus } from "@/lib/types";

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
      ...(typeof it.option === "string" && it.option ? { option: it.option } : {}),
    }));
  if (items.length === 0) return { error: "נא להוסיף לפחות פריט אחד" };

  // אפשרויות: לפחות 2 עם שם, ובחירה קיימת רק אם היא עדיין ברשימה
  const meta: QuoteMeta = { ...(input.meta ?? {}) };
  const opts = (meta.options ?? []).filter((o) => o && o.id).map((o) => ({ id: String(o.id).slice(0, 40), label: (o.label ?? "").trim().slice(0, 120) || "אפשרות" }));
  if (opts.length >= 2) meta.options = opts;
  else {
    delete meta.options;
    meta.chosen_option = null;
  }
  if (meta.chosen_option && !opts.some((o) => o.id === meta.chosen_option)) meta.chosen_option = null;

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

  const totals = calcTotals({ ...input, items, meta });
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
    meta,
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
  if (status === "sent") patch.sent_at = new Date().toISOString();
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
  await supabase.from("quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id).eq("status", "draft");
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

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : "";
}

/** אישור הצעה ע"י הלקוח מהקישור הציבורי (כולל בחירת אפשרות, אם יש) */
export async function approveByToken(token: string, name: string, optionId?: string | null): Promise<{ ok?: boolean; error?: string }> {
  const n = name.trim();
  if (n.length < 2) return { error: "נא להקליד שם מלא" };
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("*").eq("share_token", token).maybeSingle<Quote>();
  if (!q) return { error: "ההצעה לא נמצאה" };
  if (q.status === "approved") return { ok: true };
  const patch: Record<string, unknown> = { status: "approved", approved_by_name: n.slice(0, 80), approved_at: new Date().toISOString() };
  if (hasOptions(q.meta)) {
    if (!optionId || !q.meta.options!.some((o) => o.id === optionId)) return { error: "נא לבחור אחת מהאפשרויות" };
    const meta = { ...q.meta, chosen_option: optionId };
    const t = calcTotals({ ...q, meta });
    Object.assign(patch, { meta, subtotal: t.subtotal, total: t.total });
  }
  const { error } = await admin.from("quotes").update(patch).eq("id", q.id);
  if (error) return { error: "האישור נכשל, נסו שוב" };
  await Promise.allSettled([onQuoteApproved(q.id), notifyOwner(q.id, "approved", await origin())]);
  revalidatePath(`/q/${token}`);
  return { ok: true };
}

/** הלקוח פתח את ההצעה (נקרא מהדפדפן, כך שתצוגה מקדימה של וואטסאפ לא נספרת) */
export async function markViewed(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return;
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("id,business_id,viewed_at,view_count").eq("share_token", token).maybeSingle();
  if (!q) return;
  // צפייה של אנשי העסק עצמם לא נחשבת
  const s = await getSession().catch(() => null);
  if (s?.profile && (s.profile.business_id === q.business_id || s.profile.is_super_admin)) return;
  const now = new Date().toISOString();
  await admin
    .from("quotes")
    .update({ viewed_at: q.viewed_at ?? now, last_viewed_at: now, view_count: (q.view_count ?? 0) + 1 })
    .eq("id", q.id);
  if (!q.viewed_at) await notifyOwner(q.id, "viewed", await origin());
}
