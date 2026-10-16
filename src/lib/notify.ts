import "server-only";
import { createAdminClient } from "./supabase/admin";
import { sendMail } from "./mailer";
import { calcTotals, money, quoteNumber } from "./quote";
import type { Business, Quote } from "./types";

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** מייל לאיש הצוות שהפיק את ההצעה: הלקוח פתח / אישר */
export async function notifyOwner(quoteId: string, kind: "viewed" | "approved", origin = "") {
  const admin = createAdminClient();
  const { data: q } = await admin.from("quotes").select("*").eq("id", quoteId).maybeSingle<Quote>();
  if (!q) return;
  const { data: b } = await admin.from("businesses").select("*").eq("id", q.business_id).maybeSingle<Business>();
  if (!b) return;
  if (kind === "viewed" && b.notify_on_view === false) return;
  if (kind === "approved" && b.notify_on_approve === false) return;

  let to: string | null = null;
  if (q.created_by) {
    const { data: p } = await admin.from("profiles").select("email,is_active").eq("id", q.created_by).maybeSingle();
    if (p?.is_active) to = p.email;
  }
  to ??= b.email;
  if (!to) return;

  const num = quoteNumber(b.quote_prefix, q.number);
  const chosen = q.meta?.options?.find((o) => o.id === q.meta?.chosen_option);
  const total = money(calcTotals(q).total);
  const link = origin ? `${origin}/quotes/${q.id}` : "";
  const phone = q.client_phone ? q.client_phone.replace(/[^\d+]/g, "") : "";
  const subject =
    kind === "viewed" ? `👀 ${q.client_name} פתח/ה את הצעה ${num}` : `✅ ${q.client_name} אישר/ה את הצעה ${num}`;
  const lead =
    kind === "viewed"
      ? `${esc(q.client_name)} פתח/ה עכשיו את הצעת המחיר. זה זמן טוב להתקשר.`
      : `${esc(q.approved_by_name ?? q.client_name)} אישר/ה את הצעת המחיר${chosen ? ` (בחר/ה: ${esc(chosen.label)})` : ""}.`;

  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1c2230;line-height:1.6">
  <div style="background:${kind === "approved" ? "#059669" : b.primary_color};color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-size:17px;font-weight:700">${esc(subject)}</div>
  <div style="border:1px solid #e7e5e4;border-top:0;padding:16px 18px;border-radius:0 0 10px 10px">
    <p style="margin:0 0 10px">${lead}</p>
    <p style="margin:0;color:#57534e">הצעה ${esc(num)}${q.title ? ` · ${esc(q.title)}` : ""} · ${esc(total)}</p>
    ${q.client_contact || phone ? `<p style="margin:6px 0 0;color:#57534e">${esc([q.client_contact, q.client_phone].filter(Boolean).join(" · "))}</p>` : ""}
    ${link ? `<p style="margin:14px 0 0"><a href="${link}" style="background:${b.primary_color};color:#fff;padding:9px 16px;border-radius:8px;text-decoration:none;font-weight:700">פתיחת ההצעה</a></p>` : ""}
  </div>
</div>`;
  await sendMail({ to: [to], subject, html });
}
