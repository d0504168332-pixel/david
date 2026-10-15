import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

function s(form: FormData, key: string) {
  const v = String(form.get(key) ?? "").trim();
  return v.length ? v : null;
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const TEMPLATES = ["modern", "classic", "minimal", "bold"];

// ---------- לוגו ----------
export async function uploadLogo(businessId: string, file: File | null): Promise<string | null | { error: string }> {
  if (!file || file.size === 0) return null;
  if (file.size > 3 * 1024 * 1024) return { error: "הלוגו גדול מדי (עד 3MB)" };
  if (!/^image\/(png|jpe?g|webp|svg\+xml|gif)$/.test(file.type)) return { error: "פורמט לוגו לא נתמך" };
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${businessId}/logo-${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from("logos").upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error: "העלאת הלוגו נכשלה: " + error.message };
  return admin.storage.from("logos").getPublicUrl(path).data.publicUrl;
}

export function businessRowFromForm(form: FormData) {
  const primary = s(form, "primary_color");
  const accent = s(form, "accent_color");
  const template = s(form, "template");
  const vat = Number(form.get("vat_rate"));
  const start = Number(form.get("quote_start_number"));
  return {
    name: s(form, "name") ?? "",
    address: s(form, "address"),
    phone: s(form, "phone"),
    email: s(form, "email"),
    website: s(form, "website"),
    tax_id: s(form, "tax_id"),
    primary_color: primary && COLOR_RE.test(primary) ? primary : "#1f3a5f",
    accent_color: accent && COLOR_RE.test(accent) ? accent : "#c8a35a",
    template: template && TEMPLATES.includes(template) ? template : "modern",
    vat_rate: Number.isFinite(vat) && vat >= 0 && vat <= 100 ? vat : 18,
    default_notes: s(form, "default_notes"),
    default_terms: s(form, "default_terms"),
    quote_prefix: String(form.get("quote_prefix") ?? "").slice(0, 10),
    quote_start_number: Number.isInteger(start) && start > 0 ? start : 1001,
    show_tax_id: form.get("show_tax_id") === "on",
    show_website: form.get("show_website") === "on",
    request_form_type: form.get("request_form_type") === "transport" ? "transport" : "general",
    request_intro: s(form, "request_intro"),
    webhook_url: (() => {
      const u = s(form, "webhook_url");
      return u && /^https:\/\/[^\s]+$/i.test(u) ? u : null;
    })(),
  };
}

