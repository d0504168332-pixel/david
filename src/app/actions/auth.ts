"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string; ok?: string } | undefined;

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "נא למלא אימייל וסיסמה" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "אימייל או סיסמה שגויים" };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function superAdminExists() {
  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_super_admin", true);
  return (count ?? 0) > 0;
}

export async function setupSuperAdmin(_: FormState, form: FormData): Promise<FormState> {
  if (await superAdminExists()) return { error: "מנהל המערכת כבר הוגדר. התחבר בדף הכניסה." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const full_name = String(form.get("full_name") ?? "").trim();
  const allowed = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!allowed) return { error: "חסר משתנה SUPER_ADMIN_EMAIL בהגדרות השרת" };
  if (email !== allowed) return { error: "האימייל הזה אינו מורשה להיות מנהל המערכת" };
  if (password.length < 8) return { error: "הסיסמה חייבת להכיל לפחות 8 תווים" };

  const admin = createAdminClient();
  let userId: string | undefined;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    // אם המשתמש כבר קיים ב-auth — מעדכנים סיסמה
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) return { error: "יצירת המשתמש נכשלה: " + error.message };
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    userId = data.user.id;
  }
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: userId, email, full_name: full_name || "מנהל המערכת", is_super_admin: true, business_role: "manager" });
  if (pErr) return { error: "שמירת הפרופיל נכשלה: " + pErr.message };

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/admin");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 8) return { error: "הסיסמה חייבת להכיל לפחות 8 תווים" };
  if (password !== confirm) return { error: "הסיסמאות אינן תואמות" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "עדכון הסיסמה נכשל: " + error.message };
  return { ok: "הסיסמה עודכנה" };
}

/** שכחתי סיסמה: שולח קישור למייל, ובו בוחרים סיסמה חדשה */
export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "נא להזין כתובת מייל תקינה" };
  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  // זרימה "ישירה" (לא PKCE) — כך הקישור עובד גם אם נפתח בדפדפן אחר (למשל מתוך אפליקציית המייל בטלפון)
  const { createClient: createPlain } = await import("@supabase/supabase-js");
  const plain = createPlain(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await plain.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=/reset-password` });
  if (error && /rate|seconds/i.test(error.message)) return { error: "נשלחו כבר כמה קישורים. נסו שוב בעוד כמה דקות." };
  return { ok: `אם הכתובת רשומה במערכת, נשלח אליה קישור לבחירת סיסמה חדשה. בדקו את תיבת המייל (גם בספאם).` };
}

/** קביעת סיסמה חדשה אחרי לחיצה על הקישור במייל */
export async function setNewPassword(_: FormState, form: FormData): Promise<FormState> {
  const r = await changePassword(_, form);
  if (r?.error) return r;
  redirect("/");
}
