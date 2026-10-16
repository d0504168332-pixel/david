"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness, requireSession } from "@/lib/auth";
import type { FormState } from "./auth";
import { uploadLogo, businessRowFromForm } from "@/lib/business-form";

function s(form: FormData, key: string) {
  const v = String(form.get(key) ?? "").trim();
  return v.length ? v : null;
}

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// ---------- לקוחות ----------
export async function saveClient(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, profile, business } = await requireBusiness();
  const id = s(form, "id");
  const name = s(form, "name");
  if (!name) return { error: "נא למלא שם לקוח" };
  const row = {
    name,
    contact_name: s(form, "contact_name"),
    phone: s(form, "phone"),
    email: s(form, "email"),
    address: s(form, "address"),
    tax_id: s(form, "tax_id"),
    notes: s(form, "notes"),
  };
  const { error } = id
    ? await supabase.from("clients").update(row).eq("id", id)
    : await supabase.from("clients").insert({ ...row, business_id: business.id, created_by: profile.id });
  if (error) return { error: "השמירה נכשלה: " + error.message };
  revalidatePath("/clients");
  return { ok: id ? "הלקוח עודכן" : "הלקוח נוסף" };
}

export async function deleteClient(id: string) {
  const { supabase } = await requireBusiness();
  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/clients");
}

// ---------- פרטי העסק (מנהל העסק) ----------
export async function updateMyBusiness(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, profile, business } = await requireBusiness();
  if (profile.business_role !== "manager" && !profile.is_super_admin) return { error: "אין הרשאה לערוך את פרטי העסק" };
  const row: Record<string, unknown> = businessRowFromForm(form);
  delete row.business_type; // רק מנהל המערכת משנה סוג עסק
  delete row.request_form_type;
  if (!row.name) return { error: "נא למלא שם עסק" };
  const logo = await uploadLogo(business.id, form.get("logo") as File | null);
  if (logo && typeof logo === "object") return logo;
  if (typeof logo === "string") row.logo_url = logo;
  if (form.get("remove_logo") === "on") row.logo_url = null;
  const { error } = await supabase.from("businesses").update(row).eq("id", business.id);
  if (error) return { error: "השמירה נכשלה: " + error.message };
  revalidatePath("/", "layout");
  return { ok: "פרטי העסק נשמרו" };
}

// ---------- פרופיל אישי, חתימה וחותמת ----------
export type ProfileInput = {
  full_name: string;
  job_title: string;
  phone: string;
  signature_style: string;
  signature_image: string | null;
  signature_color: string;
  stamp_color: string;
  stamp_shape: "modern" | "inline" | "round" | "rect";
  show_signature: boolean;
  show_stamp: boolean;
};

const SIG_STYLES = ["amatic", "karantina", "caveat", "dancing", "vibes", "drawn"];

export async function updateMyProfile(input: ProfileInput): Promise<FormState> {
  const { supabase, profile } = await requireSession();
  if (!input.full_name?.trim()) return { error: "נא למלא שם מלא" };
  if (input.signature_image && input.signature_image.length > 400_000) return { error: "החתימה המצוירת גדולה מדי" };
  if (input.signature_image && !input.signature_image.startsWith("data:image/")) return { error: "חתימה לא תקינה" };
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      job_title: input.job_title?.trim() || null,
      phone: input.phone?.trim() || null,
      signature_style: SIG_STYLES.includes(input.signature_style) ? input.signature_style : "amatic",
      signature_image: input.signature_image || null,
      signature_color: COLOR_RE.test(input.signature_color) ? input.signature_color : "#1e3a8a",
      stamp_color: COLOR_RE.test(input.stamp_color) ? input.stamp_color : "#1d4ed8",
      stamp_shape: ["modern", "inline", "round", "rect"].includes(input.stamp_shape) ? input.stamp_shape : "modern",
      show_signature: !!input.show_signature,
      show_stamp: !!input.show_stamp,
    })
    .eq("id", profile.id);
  if (error) return { error: "השמירה נכשלה: " + error.message };
  revalidatePath("/", "layout");
  return { ok: "הפרופיל נשמר" };
}

// ---------- מחירון ואוטומציות (מנהל העסק) ----------
export type AutomationInput = {
  pricing: import("@/lib/types").Pricing | null;
  reminder_days: number;
  reminder_max: number;
  notify_on_view: boolean;
  notify_on_approve: boolean;
};

const num = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};
const hhmm = (v: unknown, dflt: string) => (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) ? v : dflt);

export async function saveAutomation(input: AutomationInput): Promise<FormState> {
  const { supabase, profile, business } = await requireBusiness();
  if (profile.business_role !== "manager" && !profile.is_super_admin) return { error: "אין הרשאה" };
  const row: Record<string, unknown> = {
    reminder_days: Math.round(num(input.reminder_days, 0, 60, 3)),
    reminder_max: Math.round(num(input.reminder_max, 1, 5, 2)),
    notify_on_view: !!input.notify_on_view,
    notify_on_approve: !!input.notify_on_approve,
  };
  if (business.business_type === "transport" && input.pricing) {
    const p = input.pricing;
    const vehicles = (p.vehicles ?? [])
      .filter((v) => v && String(v.name ?? "").trim())
      .slice(0, 12)
      .map((v, i) => ({
        id: String(v.id || `v${i}`).slice(0, 40),
        name: String(v.name).trim().slice(0, 60),
        seats: Math.round(num(v.seats, 1, 100, 50)),
        per_km: num(v.per_km, 0, 1000, 0),
        min_price: num(v.min_price, 0, 100000, 0),
        wait_hour: num(v.wait_hour, 0, 10000, 0),
      }));
    if (!vehicles.length) return { error: "נא להגדיר לפחות סוג רכב אחד" };
    row.pricing = {
      vehicles,
      night_pct: num(p.night_pct, 0, 300, 0),
      night_from: hhmm(p.night_from, "22:00"),
      night_to: hhmm(p.night_to, "06:00"),
      weekend_pct: num(p.weekend_pct, 0, 300, 0),
      friday_from: hhmm(p.friday_from, "15:00"),
      free_wait_hours: num(p.free_wait_hours, 0, 24, 0),
      round_up: num(p.round_up, 0, 1000, 0),
    };
  }
  const { error } = await supabase.from("businesses").update(row).eq("id", business.id);
  if (error) return { error: "השמירה נכשלה: " + error.message };
  revalidatePath("/automation");
  revalidatePath("/quotes", "layout");
  return { ok: "ההגדרות נשמרו" };
}
