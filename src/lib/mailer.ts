import "server-only";

type Attachment = { name: string; content: string; type: string }; // content = base64

/** שליחת מייל דרך Postmark (POSTMARK_SERVER_TOKEN) או Resend (RESEND_API_KEY). MAIL_FROM = כתובת שולח מאומתת */
export async function sendMail(opts: { to: string[]; subject: string; html: string; replyTo?: string; attachments?: Attachment[] }) {
  const from = process.env.MAIL_FROM;
  if (!from) return { ok: false, error: "MAIL_FROM לא מוגדר" };
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
