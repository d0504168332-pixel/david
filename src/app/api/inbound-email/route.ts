import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRequestHeuristic } from "@/lib/parse-request";
import { parseWithAI } from "@/lib/ai-parse";
import { extractTrip } from "@/lib/trip-parse";

export const dynamic = "force-dynamic";

/**
 * קליטת מיילים נכנסים → בקשה להצעת מחיר.
 * תומך בפורמט Postmark Inbound (JSON) ובפורמט כללי: { to, from, from_name, subject, text, html }.
 * אבטחה: ?key=INBOUND_EMAIL_SECRET בכתובת ה-Webhook.
 * ניתוב לעסק: לפי הקוד שאחרי ה-"+" בכתובת (abc+CODE@...), או לפי חלק הכתובת שלפני ה-@.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || req.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const fromFull = (body.FromFull ?? {}) as { Email?: string; Name?: string };
  const fromEmail = str(fromFull.Email) || str(body.from_email) || (str(body.From) || str(body.from)).match(/[^\s<>"]+@[^\s<>"]+/)?.[0] || "";
  const fromName = str(fromFull.Name) || str(body.from_name) || (str(body.From) || str(body.from)).replace(/<.*>/, "").replace(/"/g, "").trim();
  const subject = (str(body.Subject) || str(body.subject)).slice(0, 300);
  const text =
    str(body.StrippedTextReply) ||
    str(body.TextBody) ||
    str(body.text) ||
    (str(body.HtmlBody) || str(body.html)).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");

  // איתור קוד העסק
  const toList: string[] = [];
  const toFull = body.ToFull as { Email?: string; MailboxHash?: string }[] | undefined;
  if (Array.isArray(toFull)) toFull.forEach((t) => t.Email && toList.push(t.Email));
  if (str(body.OriginalRecipient)) toList.push(str(body.OriginalRecipient));
  if (str(body.To)) toList.push(...str(body.To).split(","));
  if (str(body.to)) toList.push(...str(body.to).split(","));
  const codes = new Set<string>();
  if (str(body.MailboxHash)) codes.add(str(body.MailboxHash).toLowerCase());
  for (const addr of toList) {
    const m = addr.match(/([^\s<>"+@]+)(?:\+([^\s<>"@]+))?@/);
    if (m?.[2]) codes.add(m[2].toLowerCase());
    if (m?.[1]) codes.add(m[1].toLowerCase());
  }
  const admin = createAdminClient();
  let biz: { id: string; is_active: boolean; business_type: string } | null = null;
  for (const c of codes) {
    if (!/^[a-z0-9]{6,40}$/.test(c)) continue;
    const { data } = await admin.from("businesses").select("id,is_active,business_type").eq("inbox_code", c).maybeSingle();
    if (data) {
      biz = data;
      break;
    }
  }
  // 200 גם כשלא נמצא — כדי שספק המייל לא ינסה שוב בלי סוף
  if (!biz || !biz.is_active || biz.business_type !== "transport") return NextResponse.json({ ok: false, error: "unknown inbox" });

  const full = [subject && `נושא: ${subject}`, fromName || fromEmail ? `מאת: ${fromName} <${fromEmail}>` : "", text].filter(Boolean).join("\n");
  const parsed = (await parseWithAI(full)) ?? parseRequestHeuristic(full);
  const isSystem = /forwarding-noreply@google\.com|no-?reply@.*(microsoft|outlook)/i.test(fromEmail);

  const { error } = await admin.from("quote_requests").insert({
    business_id: biz.id,
    source: "email",
    subject: subject || null,
    client_name: (isSystem ? "אישור העברת מייל" : parsed.client_name || fromName || fromEmail || "פנייה במייל").slice(0, 120),
    client_contact: (parsed.client_contact || fromName || null)?.slice(0, 120) ?? null,
    client_phone: parsed.client_phone || null,
    client_email: (parsed.client_email || fromEmail || null)?.slice(0, 120) ?? null,
    request_text: text.trim().slice(0, 6000) || null,
    items: isSystem ? [] : parsed.items.filter((i) => i.description).slice(0, 50).map((i) => ({ description: i.description.slice(0, 200), quantity: i.quantity || 1 })),
    trip: isSystem ? null : extractTrip(`${subject}\n${text}`),
    notes: parsed.hints || null,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
