import "server-only";

import type { SmtpAccount } from "./mail-accounts";

type Attachment = { name: string; content: string; type: string }; // content = base64

/** האם מוגדר ספק שליחת מיילים */
export function mailConfigured() {
  return !!(
    (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
    (process.env.MAIL_FROM && (process.env.POSTMARK_SERVER_TOKEN || process.env.RESEND_API_KEY))
  );
}

/**
 * שליחת מייל. סדר עדיפויות:
 * 1. ג'ימייל (GMAIL_USER + GMAIL_APP_PASSWORD — "סיסמת אפליקציה" של גוגל), או כל SMTP (SMTP_HOST/PORT/USER/PASS)
 * 2. Postmark (POSTMARK_SERVER_TOKEN) או Resend (RESEND_API_KEY) עם MAIL_FROM מאומת
 */
export async function sendMail(opts: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
  fromName?: string;
  /** תיבת המייל של העובד / העסק — כשקיימת, המייל יוצא ממנה */
  account?: SmtpAccount | null;
}) {
  if (opts.account) return sendSmtp(opts.account, opts);
  const gUser = process.env.GMAIL_USER?.trim();
  const gPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const smtpHost = process.env.SMTP_HOST;
  if ((gUser && gPass) || (smtpHost && process.env.SMTP_USER && process.env.SMTP_PASS)) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const user = gUser && gPass ? gUser : process.env.SMTP_USER!;
      const transport = nodemailer.createTransport(
        gUser && gPass
          ? { host: "smtp.gmail.com", port: 465, secure: true, auth: { user: gUser, pass: gPass } }
          : {
              host: smtpHost,
              port: Number(process.env.SMTP_PORT || 465),
              secure: Number(process.env.SMTP_PORT || 465) === 465,
              auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
            }
      );
      const name = (opts.fromName ?? process.env.MAIL_FROM_NAME ?? "הצעות מחיר").replace(/["<>]/g, "");
      const info = await transport.sendMail({
        from: { name, address: user },
        to: opts.to.join(","),
        subject: opts.subject,
        html: opts.html,
        replyTo: opts.replyTo,
        attachments: (opts.attachments ?? []).map((a) => ({ filename: a.name, content: Buffer.from(a.content, "base64"), contentType: a.type })),
      });
      return { ok: true, status: 200, text: String(info.messageId ?? "").slice(0, 200) };
    } catch (e) {
      return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) };
    }
  }

  const from = process.env.MAIL_FROM;
  if (!from) return { ok: false, error: "שליחת מיילים לא הוגדרה (GMAIL_USER + GMAIL_APP_PASSWORD)" };
  const pm = process.env.POSTMARK_SERVER_TOKEN;
  const rs = process.env.RESEND_API_KEY;
  try {
    if (pm) {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", "X-Postmark-Server-Token": pm },
        body: JSON.stringify({
          From: from,
          To: opts.to.join(","),
          Subject: opts.subject,
          HtmlBody: opts.html,
          ReplyTo: opts.replyTo,
          MessageStream: "outbound",
          Attachments: (opts.attachments ?? []).map((a) => ({ Name: a.name, Content: a.content, ContentType: a.type })),
        }),
        signal: AbortSignal.timeout(10000),
      });
      return { ok: res.ok, status: res.status, text: (await res.text()).slice(0, 400) };
    }
    if (rs) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rs}` },
        body: JSON.stringify({
          from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
          reply_to: opts.replyTo,
          attachments: (opts.attachments ?? []).map((a) => ({ filename: a.name, content: a.content })),
        }),
        signal: AbortSignal.timeout(10000),
      });
      return { ok: res.ok, status: res.status, text: (await res.text()).slice(0, 400) };
    }
    return { ok: false, error: "אין ספק מייל מוגדר (POSTMARK_SERVER_TOKEN או RESEND_API_KEY)" };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
}

/** שליחה דרך תיבת מייל ספציפית (SMTP) */
export async function sendSmtp(
  a: SmtpAccount,
  opts: { to: string[]; subject: string; html: string; replyTo?: string; attachments?: Attachment[]; fromName?: string }
) {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const t = nodemailer.createTransport({
      host: a.host,
      port: a.port,
      secure: a.port === 465,
      requireTLS: a.port !== 465,
      auth: { user: a.user, pass: a.pass },
      connectionTimeout: 10000,
    });
    const info = await t.sendMail({
      from: { name: (opts.fromName ?? "").replace(/["<>]/g, "") || a.email, address: a.email },
      to: opts.to.join(","),
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      attachments: (opts.attachments ?? []).map((x) => ({ filename: x.name, content: Buffer.from(x.content, "base64"), contentType: x.type })),
    });
    return { ok: true, status: 200, text: String(info.messageId ?? "").slice(0, 200) };
  } catch (e) {
    return { ok: false, error: friendlySmtpError(e) };
  }
}

export function friendlySmtpError(e: unknown) {
  const m = String((e as Error)?.message ?? e);
  if (/535|Invalid login|Username and Password not accepted|authentication failed|AUTH/i.test(m))
    return "המייל או סיסמת האפליקציה שגויים (בג'ימייל צריך סיסמת אפליקציה, לא הסיסמה הרגילה)";
  if (/ENOTFOUND|getaddrinfo/i.test(m)) return "שרת המייל לא נמצא — בדקו את כתובת השרת";
  if (/ETIMEDOUT|timeout|ECONNREFUSED/i.test(m)) return "אין תשובה משרת המייל — בדקו שרת ופורט";
  return m.slice(0, 200);
}
