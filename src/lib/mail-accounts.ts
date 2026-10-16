import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

/** הגדרות שרת יוצא לפי ספק המייל */
export function presetFor(email: string): { host: string; port: number; label: string; help?: string } | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com")
    return { host: "smtp.gmail.com", port: 465, label: "Gmail", help: "https://myaccount.google.com/apppasswords" };
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return { host: "smtp-mail.outlook.com", port: 587, label: "Outlook" };
  if (/^yahoo\./.test(domain)) return { host: "smtp.mail.yahoo.com", port: 465, label: "Yahoo" };
  if (domain === "walla.co.il" || domain === "walla.com") return { host: "out.walla.co.il", port: 587, label: "וואלה" };
  return null;
}

// מפתח ההצפנה נגזר מסוד שקיים רק בשרת
function key() {
  const base = process.env.MAIL_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("missing server secret");
  return createHash("sha256").update("qc-mail:" + base).digest();
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(blob: string) {
  const [iv, tag, enc] = blob.split(".").map((s) => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

export type SmtpAccount = { email: string; host: string; port: number; user: string; pass: string };

type Row = { email: string; smtp_host: string; smtp_port: number; smtp_user: string; secret_enc: string; profile_id: string | null };

function toAccount(r: Row | null | undefined): SmtpAccount | null {
  if (!r) return null;
  try {
    return { email: r.email, host: r.smtp_host, port: r.smtp_port, user: r.smtp_user, pass: decrypt(r.secret_enc) };
  } catch {
    return null;
  }
}

/** תיבת השליחה: של העובד, ואם לא חיבר — של העסק */
export async function senderFor(businessId: string, profileId?: string | null): Promise<SmtpAccount | null> {
  const admin = createAdminClient();
  if (profileId) {
    const { data } = await admin.from("mail_accounts").select("*").eq("profile_id", profileId).maybeSingle<Row>();
    const a = toAccount(data);
    if (a) return a;
  }
  const { data } = await admin.from("mail_accounts").select("*").eq("business_id", businessId).is("profile_id", null).maybeSingle<Row>();
  return toAccount(data);
}

/** סטטוס חיבור (בלי סיסמאות) — להצגה במסכים */
export async function mailStatus(businessId: string, profileId?: string | null) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mail_accounts")
    .select("email,profile_id,verified_at,last_error")
    .eq("business_id", businessId)
    .or(profileId ? `profile_id.eq.${profileId},profile_id.is.null` : "profile_id.is.null");
  const mine = (data ?? []).find((r) => r.profile_id === profileId) ?? null;
  const biz = (data ?? []).find((r) => !r.profile_id) ?? null;
  return {
    mine: mine ? { email: mine.email as string, verified: !!mine.verified_at, error: mine.last_error as string | null } : null,
    business: biz ? { email: biz.email as string, verified: !!biz.verified_at, error: biz.last_error as string | null } : null,
    ready: !!(mine?.verified_at || biz?.verified_at),
  };
}
