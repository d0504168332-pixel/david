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
    stamp_shape: p.stamp_shape ?? "round",
    show_signature: p.show_signature ?? true,
    show_stamp: p.show_stamp ?? true,
  };
}
