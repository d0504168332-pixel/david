import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mailer";
import { calcTotals, money, quoteNumber } from "@/lib/quote";
import type { Business, Quote } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
const DAY = 86400000;

/**
 * תזכורת אוטומטית במייל ללקוחות שלא ענו על הצעה.
 * רץ פעם ביום (Vercel Cron). מוגן ב-CRON_SECRET.
 * הצעה בסטטוס "נשלחה", שנשלחה לפני X ימים (הגדרה לכל עסק), עם מייל ללקוח, ושעוד בתוקף.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const origin = process.env.APP_URL?.replace(/\/$/, "") || `https://${req.headers.get("host")}`;
  const today = new Date().toISOString().slice(0, 10);

  const { data: businesses } = await admin.from("businesses").select("*").eq("is_active", true).gt("reminder_days", 0).returns<Business[]>();
  let sent = 0;
  const failed: string[] = [];
  for (const b of businesses ?? []) {
    const cutoff = new Date(Date.now() - b.reminder_days * DAY).toISOString();
    const { data: quotes } = await admin
      .from("quotes")
      .select("*")
      .eq("business_id", b.id)
      .eq("status", "sent")
      .lt("sent_at", cutoff)
      .lt("reminder_count", b.reminder_max ?? 2)
      .not("client_email", "is", null)
      .limit(50)
      .returns<Quote[]>();
    for (const q of quotes ?? []) {
      if (q.valid_until && q.valid_until < today) continue;
      // בין תזכורת לתזכורת עוברים לפחות אותם X ימים
      if (q.reminded_at && Date.parse(q.reminded_at) > Date.now() - b.reminder_days * DAY) continue;
      let author: { full_name: string; email: string; phone: string | null } | null = null;
      if (q.created_by) {
        const { data } = await admin.from("profiles").select("full_name,email,phone").eq("id", q.created_by).maybeSingle();
        author = data;
      }
      const num = quoteNumber(b.quote_prefix, q.number);
      const link = `${origin}/q/${q.share_token}`;
      const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1c2230;line-height:1.7">
  <p>שלום ${esc(q.client_contact || q.client_name)},</p>
  <p>רצינו לוודא שקיבלת את הצעת המחיר מס׳ ${esc(num)}${q.title ? ` (${esc(q.title)})` : ""} על סך ${esc(money(calcTotals(q).total))}.</p>
  <p>אפשר לצפות בהצעה ולאשר אותה בלחיצה:</p>
  <p><a href="${link}" style="background:${b.primary_color};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">לצפייה ואישור ההצעה</a></p>
  <p>נשמח לענות על כל שאלה${author?.phone ? ` בטלפון ${esc(author.phone)}` : ""}.</p>
  <p>בברכה,<br>${esc(author?.full_name || b.name)}<br>${esc(b.name)}</p>
</div>`;
      const r = await sendMail({
        to: [q.client_email!],
        subject: `תזכורת: הצעת מחיר ${num} מ${b.name}`,
        html,
        replyTo: author?.email ?? b.email ?? undefined,
        fromName: b.name,
      });
      if (r.ok) {
        sent++;
        await admin
          .from("quotes")
          .update({ reminded_at: new Date().toISOString(), reminder_count: (q.reminder_count ?? 0) + 1 })
          .eq("id", q.id);
      } else failed.push(`${num}: ${"error" in r ? r.error : r.status}`);
    }
  }
  return NextResponse.json({ ok: true, sent, failed });
}
