"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadLogo, businessRowFromForm } from "@/lib/business-form";
import type { FormState } from "./auth";

function s(form: FormData, key: string) {
  const v = String(form.get(key) ?? "").trim();
  return v.length ? v : null;
}

export async function createBusiness(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const row: Record<string, unknown> = businessRowFromForm(form);
  if (!row.name) return { error: "נא למלא שם עסק" };
  const admin = createAdminClient();
  const { data, error } = await admin.from("businesses").insert(row).select("id").single();
  if (error) return { error: "יצירת העסק נכשלה: " + error.message };
  const logo = await uploadLogo(data.id, form.get("logo") as File | null);
  if (typeof logo === "string") await admin.from("businesses").update({ logo_url: logo }).eq("id", data.id);
  revalidatePath("/admin");
  redirect(`/admin/${data.id}?created=1`);
}

export async function updateBusinessAdmin(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const id = s(form, "business_id");
  if (!id) return { error: "עסק לא נמצא" };
  const row: Record<string, unknown> = businessRowFromForm(form);
  if (!row.name) return { error: "נא למלא שם עסק" };
  const logo = await uploadLogo(id, form.get("logo") as File | null);
  if (logo && typeof logo === "object") return logo;
  if (typeof logo === "string") row.logo_url = logo;
  if (form.get("remove_logo") === "on") row.logo_url = null;
  const { error } = await createAdminClient().from("businesses").update(row).eq("id", id);
  if (error) return { error: "השמירה נכשלה: " + error.message };
  revalidatePath(`/admin/${id}`);
  revalidatePath("/", "layout");
  return { ok: "פרטי העסק נשמרו" };
}

export async function setBusinessActive(id: string, active: boolean) {
  await requireSuperAdmin();
  await createAdminClient().from("businesses").update({ is_active: active }).eq("id", id);
  revalidatePath(`/admin/${id}`);
  revalidatePath("/admin");
}

export async function deleteBusiness(id: string) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  // משתמשי העסק נשארים קיימים אך מנותקים מהעסק ומושבתים
  await admin.from("profiles").update({ business_id: null, is_active: false }).eq("business_id", id).eq("is_super_admin", false);
  await admin.from("profiles").update({ business_id: null }).eq("business_id", id).eq("is_super_admin", true);
  await admin.from("businesses").delete().eq("id", id);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function createMember(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const business_id = s(form, "business_id");
  const email = (s(form, "email") ?? "").toLowerCase();
  const password = String(form.get("password") ?? "");
  const full_name = s(form, "full_name");
  if (!business_id) return { error: "עסק לא נמצא" };
  if (!email || !full_name) return { error: "נא למלא שם ואימייל" };
  if (password.length < 8) return { error: "הסיסמה חייבת להכיל לפחות 8 תווים" };
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (/already/i.test(error.message)) return { error: "כבר קיים משתמש עם האימייל הזה" };
    return { error: "יצירת המשתמש נכשלה: " + error.message };
  }
  const { error: pErr } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name,
    job_title: s(form, "job_title"),
    phone: s(form, "phone"),
    business_id,
    business_role: form.get("business_role") === "manager" ? "manager" : "member",
    is_active: true,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "שמירת הפרופיל נכשלה: " + pErr.message };
  }
  revalidatePath(`/admin/${business_id}`);
  return { ok: `המשתמש ${full_name} נוצר. פרטי כניסה: ${email}` };
}

export async function updateMember(_: FormState, form: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const id = s(form, "user_id");
  const business_id = s(form, "business_id");
  if (!id) return { error: "משתמש לא נמצא" };
  const full_name = s(form, "full_name");
  if (!full_name) return { error: "נא למלא שם" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name,
      job_title: s(form, "job_title"),
      phone: s(form, "phone"),
      business_role: form.get("business_role") === "manager" ? "manager" : "member",
    })
    .eq("id", id);
  if (error) return { error: "השמירה נכשלה: " + error.message };
  const password = String(form.get("password") ?? "");
  if (password) {
    if (password.length < 8) return { error: "סיסמה חדשה חייבת להכיל לפחות 8 תווים" };
    const { error: pwErr } = await admin.auth.admin.updateUserById(id, { password });
    if (pwErr) return { error: "עדכון הסיסמה נכשל: " + pwErr.message };
  }
  revalidatePath(`/admin/${business_id}`);
  return { ok: password ? "הפרטים והסיסמה עודכנו" : "הפרטים עודכנו" };
}

export async function setMemberActive(id: string, businessId: string, active: boolean) {
  const { profile } = await requireSuperAdmin();
  if (id === profile.id) return;
  await createAdminClient().from("profiles").update({ is_active: active }).eq("id", id);
  revalidatePath(`/admin/${businessId}`);
}

export async function deleteMember(id: string, businessId: string) {
  const { profile } = await requireSuperAdmin();
  if (id === profile.id) return;
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
  revalidatePath(`/admin/${businessId}`);
}

/** שיוך מנהל המערכת עצמו לעסק — כדי שיוכל להפיק הצעות בשמו */
export async function assignSelf(businessId: string | null) {
  const { profile } = await requireSuperAdmin();
  await createAdminClient()
    .from("profiles")
    .update({ business_id: businessId, business_role: "manager" })
    .eq("id", profile.id);
  revalidatePath("/", "layout");
  redirect(businessId ? "/quotes" : "/admin");
}
