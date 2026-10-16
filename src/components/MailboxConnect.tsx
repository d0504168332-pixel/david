"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Mail, Unplug } from "lucide-react";
import { connectMailbox, disconnectMailbox } from "@/app/actions/mail";

type Status = { email: string; verified: boolean; error: string | null } | null;

function presetLabel(email: string) {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  if (d === "gmail.com") return "gmail";
  if (/^(outlook|hotmail|live|msn)\./.test(d)) return "outlook";
  if (/^yahoo\./.test(d) || d.startsWith("walla.")) return "known";
  return d.includes(".") ? "custom" : "";
}

/** חיבור תיבת מייל לשליחה — של העובד (scope=me) או של העסק (scope=business) */
export default function MailboxConnect({ scope, status, defaultEmail, title, subtitle }: { scope: "me" | "business"; status: Status; defaultEmail: string; title: string; subtitle: string }) {
  const [email, setEmail] = useState(status?.email ?? defaultEmail);
  const [password, setPassword] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(465);
  const [editing, setEditing] = useState(!status);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const kind = presetLabel(email);

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
        <Mail className="size-5 text-brand" /> {title}
      </h2>
      <p className="mb-4 text-sm text-stone-500">{subtitle}</p>

      {status && !editing ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <div className="font-bold" dir="ltr" style={{ textAlign: "right" }}>
              {status.email}
            </div>
            <div className="text-xs text-emerald-800">מחובר — המיילים יוצאים מהכתובת הזו</div>
          </div>
          <button className="btn-ghost h-9 text-sm" onClick={() => setEditing(true)}>
            החלפה
          </button>
          <button
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            disabled={pending}
            onClick={() => start(() => disconnectMailbox(scope))}
          >
            <Unplug className="size-4" /> ניתוק
          </button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(null);
            start(async () => {
              const r = await connectMailbox({ scope, email, password, host: kind === "custom" ? host : undefined, port: kind === "custom" ? port : undefined });
              setMsg(r);
              if (r.ok) {
                setPassword("");
                setEditing(false);
              }
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`${scope}-email`}>
                כתובת המייל
              </label>
              <input id={`${scope}-email`} className="field text-right" dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor={`${scope}-pass`}>
                {kind === "gmail" ? "סיסמת אפליקציה (16 תווים)" : "סיסמה / סיסמת אפליקציה"}
              </label>
              <input
                id={`${scope}-pass`}
                className="field text-right"
                dir="ltr"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {kind === "custom" ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div>
                <label className="label" htmlFor={`${scope}-host`}>
                  שרת יוצא (SMTP)
                </label>
                <input id={`${scope}-host`} className="field text-right" dir="ltr" placeholder="mail.company.co.il" value={host} onChange={(e) => setHost(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor={`${scope}-port`}>
                  פורט
                </label>
                <select id={`${scope}-port`} className="field" value={port} onChange={(e) => setPort(Number(e.target.value))}>
                  <option value={465}>465</option>
                  <option value={587}>587</option>
                </select>
              </div>
              <p className="text-xs text-stone-500 sm:col-span-2">את פרטי השרת אפשר לקבל ממי שמנהל את המייל של החברה (או מספק האחסון).</p>
            </div>
          ) : null}

          {kind === "gmail" ? (
            <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-950">
              <b>בג&apos;ימייל צריך &quot;סיסמת אפליקציה&quot;</b> (לא הסיסמה הרגילה):
              <ol className="mt-1 list-inside list-decimal space-y-0.5">
                <li>
                  נכנסים ל-
                  <a className="font-semibold underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
                    סיסמאות אפליקציה <ExternalLink className="inline size-3" />
                  </a>{" "}
                  (אם מתבקש — מפעילים קודם אימות דו-שלבי)
                </li>
                <li>שם: &quot;הצעות מחיר&quot; ← יצירה</li>
                <li>מעתיקים את 16 התווים ומדביקים כאן</li>
              </ol>
            </div>
          ) : kind === "outlook" ? (
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-950">
              ב-Outlook/Hotmail: אם מופעל אימות דו-שלבי, יוצרים &quot;סיסמת אפליקציה&quot; בהגדרות האבטחה של חשבון Microsoft.
            </p>
          ) : null}

          {msg?.error ? <div className="text-sm font-semibold text-rose-600">{msg.error}</div> : null}
          <div className="flex items-center gap-2">
            <button className="btn-primary" disabled={pending}>
              {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Mail className="size-4" />}
              {pending ? "בודק חיבור…" : "חיבור ובדיקה"}
            </button>
            {status ? (
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                ביטול
              </button>
            ) : null}
          </div>
          <p className="text-xs text-stone-500">נשלח מייל ניסיון לכתובת הזו. הסיסמה נשמרת מוצפנת ומשמשת רק לשליחת מיילים מהמערכת.</p>
        </form>
      )}
      {msg?.ok ? <div className="mt-3 text-sm font-semibold text-emerald-700">{msg.ok}</div> : null}
    </section>
  );
}
