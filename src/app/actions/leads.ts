"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth";
import { decrypt, type SmtpAccount } from "@/lib/mail-accounts";
import { mailConfigured, sendMail } from "@/lib/mailer";

export type LeadState = { ok?: boolean; error?: string } | undefined;

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clip = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n);

/** בקשת מנוי מגולש בלי משתמש: נשמרת במערכת ונשלחת במייל למנהל המערכת */
export async function submitLead(_: LeadState, fd: FormData): Promise<LeadState> {
  if (clip(fd.get("website"), 50)) return { ok: true }; // מלכודת לרובוטים
  const lead = {
    full_name: clip(fd.get("full_name"), 80),
    business_name: clip(fd.get("business_name"), 120) || null,
    phone: clip(fd.get("phone"), 30),
    email: clip(fd.get("email"), 120).toLowerCase() || null,
    business_type: clip(fd.get("business_type"), 40) || null,
    team_size: clip(fd.get("team_size"), 20) || null,
    message: clip(fd.get("message"), 1000) || null,
  };
  if (lead.full_name.length < 2) return { error: "נא למלא שם" };
  if (lead.phone.replace(/\D/g, "").length < 9) return { error: "נא למלא מספר טלפון תקין" };
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return { error: "כתובת המייל לא תקינה" };

  const admin = createAdminClient();
  // הגנה מהצפה: עד 5 בקשות מאותו טלפון ביום
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await admin.from("signup_leads").select("id", { count: "exact", head: true }).eq("phone", lead.phone).gte("created_at", since);
  if ((count ?? 0) >= 5) return { ok: true };

  const { data: row, error } = await admin.from("signup_leads").insert(lead).select("id").single();
  if (error) return { error: "השליחה נכשלה, נסו שוב בעוד רגע" };

  // מייל למנהל המערכת — מהמייל שהוא חיבר בעמוד הניהול (או מספק מייל כללי אם הוגדר)
  try {
    const { data: sa } = await admin.from("profiles").select("id,email").eq("is_super_admin", true).limit(1).maybeSingle();
    const to = (process.env.SUPER_ADMIN_EMAIL ?? "").trim() || sa?.email;
    let account: SmtpAccount | null = null;
    if (sa) {
      const { data: m } = await admin.from("mail_accounts").select("*").eq("profile_id", sa.id).maybeSingle();
      if (m) {
        try {
          account = { email: m.email, host: m.smtp_host, port: m.smtp_port, user: m.smtp_user, pass: decrypt(m.secret_enc) };
        } catch {}
      }
    }
    if (to && (account || mailConfigured())) {
      const h = await headers();
      const origin = process.env.APP_URL || `https://${h.get("host")}`;
      const line = (k: string, v: string | null) => (v ? `<tr><td style="padding:4px 0 4px 14px;color:#78716c">${k}</td><td style="padding:4px 0;font-weight:700">${esc(v)}</td></tr>` : "");
      const phoneIntl = lead.phone.replace(/\D/g, "").replace(/^0/, "972");
      const r = await sendMail({
        to: [to],
        subject: `🔔 בקשת מנוי חדשה לסגרנו – ${lead.full_name}${lead.business_name ? ` (${lead.business_name})` : ""}`,
        fromName: "סגרנו",
        account,
        replyTo: lead.email ?? undefined,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1c1917">
          <h2 style="color:#16263F;margin:0 0 12px">בקשת מנוי חדשה</h2>
          <table style="border-collapse:collapse">${line("שם", lead.full_name)}${line("עסק", lead.business_name)}${line("טלפון", lead.phone)}${line("מייל", lead.email)}${line("תחום", lead.business_type)}${line("עובדים", lead.team_size)}${line("הערות", lead.message)}</table>
          <p style="margin-top:18px">
            <a href="https://wa.me/${phoneIntl}" style="background:#25D366;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">וואטסאפ</a>
            &nbsp;<a href="${origin}/admin" style="background:#16263F;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">פתיחת עסק במערכת</a>
          </p></div>`,
      });
      if (r?.ok) await admin.from("signup_leads").update({ emailed: true }).eq("id", row.id);
    }
  } catch {}
  revalidatePath("/admin");
  return { ok: true };
}

export async function setLeadStatus(id: string, status: "new" | "done") {
  await requireSuperAdmin();
  await createAdminClient().from("signup_leads").update({ status }).eq("id", id);
  revalidatePath("/admin");
}
