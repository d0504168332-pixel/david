import "server-only";
import { createAdminClient } from "./supabase/admin";
import { sendQuoteEvent } from "./webhook";
import { sendMail } from "./mailer";
import { tripCsv, tripEmailHtml } from "./trip-export";
import { toWin1255, yitText } from "./yit-export";
import { quoteNumber } from "./quote";
import type { Business, Quote } from "./types";

/** מייל לסדרן/ספק עם פרטי הנסיעה וקובץ לייבוא — נשלח כשהצעה מאושרת */
export async function sendTripEmail(quoteId: string) {
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("*").eq("id", quoteId).maybeSingle<Quote>();
  if (!q) return { ok: false };
  const { data: b } = await admin.from("businesses").select("*").eq("id", q.business_id).maybeSingle<Business>();
  const to = (b?.ops_emails ?? "").split(/[,;\s]+/).map((s) => s.trim()).filter((s) => /@/.test(s));
  if (!b || !to.length) return { ok: false, skipped: true };
  const num = quoteNumber(b.quote_prefix, q.number);
  const t = q.meta?.trip;
  const subject = `נסיעה מאושרת ${num} – ${q.client_name}${t?.date ? ` – ${t.date.split("-").reverse().join(".")}` : ""}`;
  const r = await sendMail({
    to,
    subject,
    html: tripEmailHtml(q, b),
    replyTo: q.client_email ?? undefined,
    attachments: [
      // קובץ לייבוא ישיר ל-YIT (אותו מבנה כמו קובץ הייצוא של YIT)
      { name: `YIT_${num}.txt`, content: Buffer.from(toWin1255(yitText(q))).toString("base64"), type: "text/plain" },
      // אותם פרטים לאקסל
      { name: `trip-${num}.csv`, content: Buffer.from(tripCsv(q, b), "utf8").toString("base64"), type: "text/csv" },
    ],
  });
  await admin.from("webhook_deliveries").insert({
    business_id: b.id,
    quote_id: q.id,
    event: "email.trip",
    url: `mailto:${to.join(",")}`,
    status_code: "status" in r ? (r.status ?? null) : null,
    ok: !!r.ok,
    response: ("text" in r ? r.text : r.error) ?? null,
  });
  return r;
}

/** כל מה שקורה כשהצעה מאושרת: Webhook למערכת חיצונית + מייל נסיעה לסדרן */
export async function onQuoteApproved(quoteId: string) {
  const { data: q } = await createAdminClient().from("quotes").select("business_id").eq("id", quoteId).maybeSingle();
  if (!q) return;
  const { data: b } = await createAdminClient().from("businesses").select("business_type").eq("id", q.business_id).maybeSingle();
  if (b?.business_type !== "transport") return; // מייל לסדרן ו-YIT — רק לחברות הסעות
  await Promise.allSettled([sendQuoteEvent(quoteId), sendTripEmail(quoteId)]);
}
