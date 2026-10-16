import type { Business, Profile } from "./types";

export const AUTHOR_COLS =
  "id,full_name,job_title,phone,email,signature_style,signature_image,signature_color,stamp_color,stamp_shape,show_signature,show_stamp";

export function toDocBusiness(b: Business) {
  return {
    name: b.name,
    logo_url: b.logo_url,
    address: b.address,
    phone: b.phone,
    email: b.email,
    website: b.website,
    tax_id: b.tax_id,
    primary_color: b.primary_color,
    accent_color: b.accent_color,
    template: b.template,
    quote_prefix: b.quote_prefix,
    show_tax_id: b.show_tax_id,
    show_website: b.show_website,
    vat_rate: Number(b.vat_rate),
    default_notes: b.default_notes,
    default_terms: b.default_terms,
    request_form_type: b.business_type ?? "general",
  };
}

export function toDocAuthor(p: Partial<Profile> | null) {
  if (!p) return null;
  return {
    full_name: p.full_name ?? "",
    job_title: p.job_title ?? null,
    phone: p.phone ?? null,
    email: p.email ?? "",
    signature_style: p.signature_style ?? "amatic",
    signature_image: p.signature_image ?? null,
    signature_color: p.signature_color ?? "#1e3a8a",
    stamp_color: p.stamp_color ?? "#1d4ed8",
    stamp_shape: p.stamp_shape ?? "modern",
    show_signature: p.show_signature ?? true,
    show_stamp: p.show_stamp ?? true,
  };
}

import type { PastPrice } from "./price-check";
import { TRANSPORT_TEMPLATES, type TemplateLike } from "./templates";
import type { QuoteTemplate } from "./types";

/** נתונים נוספים לעורך: מחירון, תבניות והרשאה לערוך מחירון */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function editorExtras(supabase: any, business: Business, profile: Profile) {
  const { data } = await supabase.from("quote_templates").select("*").eq("business_id", business.id).order("name");
  const saved: TemplateLike[] = ((data ?? []) as QuoteTemplate[]).map((t) => ({ ...t, items: t.items ?? [], meta: t.meta ?? {} }));
  const transport = business.business_type === "transport";
  const builtins = transport ? TRANSPORT_TEMPLATES.filter((b) => !saved.some((s) => s.name === b.name)) : [];
  return {
    pricing: transport ? business.pricing ?? null : null,
    templates: [...saved, ...builtins],
    canEditPricing: transport && (profile.business_role === "manager" || profile.is_super_admin),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadPriceHistory(supabase: any, businessId: string, excludeId?: string): Promise<PastPrice[]> {
  let q = supabase
    .from("quotes")
    .select("id,number,client_id,client_name,issue_date,items")
    .eq("business_id", businessId)
    .order("issue_date", { ascending: false })
    .limit(400);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  const out: PastPrice[] = [];
  for (const row of data ?? []) {
    for (const it of (row.items ?? []) as { description?: string; unit_price?: number }[]) {
      if (it.description && Number(it.unit_price) > 0)
        out.push({
          quote_id: row.id,
          client_id: row.client_id,
          number: row.number,
          client_name: row.client_name,
          issue_date: row.issue_date,
          description: it.description,
          unit_price: Number(it.unit_price),
        });
    }
  }
  return out;
}
