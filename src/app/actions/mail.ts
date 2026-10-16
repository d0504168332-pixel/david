"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, presetFor } from "@/lib/mail-accounts";
import { friendlySmtpError } from "@/lib/mailer";

export type MailConnectInput = {
  scope: "me" | "business";
  email: string;
  password: string;
  host?: string;
  port?: number;
  user?: string;
};

/** חיבור תיבת מייל: בודק התחברות, שולח מייל ניסיון לעצמך ושומר מוצפן */
export async function connectMailbox(input: MailConnectInput): Promise<{ ok?: string; error?: string }> {
  const { profile, business } = await requireSession();
  if (!business && !(profile.is_super_admin && input.scope === "me")) return { error: "אין עסק משויך למשתמש" };
  if (input.scope === "business" && profile.business_role !== "manager" && !profile.is_super_admin)
    return { error: "רק מנהל העסק יכול לחבר את מייל העסק" };
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "כתובת מייל לא תקינה" };
  const pass = input.password.replace(/\s+/g, "");
  if (pass.length < 4) return { error: "נא להזין את סיסמת האפליקציה" };
  const preset = presetFor(email);
  const host = (input.host?.trim() || preset?.host || "").toLowerCase();
  const port = Number(input.port) || preset?.port || 465;
  if (!host) return { error: "לספק המייל הזה צריך להזין כתובת שרת יוצא (SMTP)" };
  const user = input.user?.trim() || email;

  const nodemailer = (await import("nodemailer")).default;
  const t = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    connectionTimeout: 10000,
  });
  try {
    await t.verify();
    await t.sendMail({
      from: { name: business?.name ?? "סגרנו", address: email },
      to: email,
      subject: `✅ המייל חובר למערכת הצעות המחיר`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px">שלום ${profile.full_name || ""},<br>המייל <b>${email}</b> חובר בהצלחה. ${business ? `מעכשיו הצעות המחיר, התזכורות וההתראות של ${business.name} יישלחו ממנו.` : "מעכשיו בקשות מנוי חדשות יגיעו אליך מהמערכת."}</div>`,
    });
  } catch (e) {
    return { error: friendlySmtpError(e) };
  }

  const admin = createAdminClient();
  const row = {
    business_id: business?.id ?? null,
    profile_id: input.scope === "me" ? profile.id : null,
    email,
    smtp_host: host,
    smtp_port: port,
    smtp_user: user,
    secret_enc: encrypt(pass),
    verified_at: new Date().toISOString(),
    last_error: null,
    updated_at: new Date().toISOString(),
  };
  const q =
    input.scope === "me"
      ? admin.from("mail_accounts").select("id").eq("profile_id", profile.id)
      : admin.from("mail_accounts").select("id").eq("business_id", business!.id).is("profile_id", null);
  const { data: existing } = await q.maybeSingle();
  const { error } = existing
    ? await admin.from("mail_accounts").update(row).eq("id", existing.id)
    : await admin.from("mail_accounts").insert(row);
  if (error) return { error: "השמירה נכשלה: " + error.message };
  revalidatePath("/profile");
  revalidatePath("/business");
  revalidatePath("/admin");
  return { ok: `המייל חובר! שלחנו מייל ניסיון ל-${email}` };
}

export async function disconnectMailbox(scope: "me" | "business") {
  const { profile, business } = await requireSession();
  if (scope === "business" && (!business || (profile.business_role !== "manager" && !profile.is_super_admin))) return;
  const admin = createAdminClient();
  if (scope === "me") await admin.from("mail_accounts").delete().eq("profile_id", profile.id);
  else await admin.from("mail_accounts").delete().eq("business_id", business!.id).is("profile_id", null);
  revalidatePath("/profile");
  revalidatePath("/business");
  revalidatePath("/admin");
}
