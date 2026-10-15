"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Download, Phone, Mail, Printer } from "lucide-react";
import { approveByToken } from "@/app/actions/quotes";
import { downloadPdf } from "@/lib/pdf";

type Props = {
  token: string;
  approved: boolean;
  approvedBy: string | null;
  expired: boolean;
  fileName: string;
  contact: { name: string; phone: string | null; email: string | null };
};

export default function PublicActions({ token, approved, approvedBy, expired, fileName, contact }: Props) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(approved);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <button
          className="btn-primary w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadPdf(document.getElementById("quote-doc") as HTMLElement, fileName.replace(/[\\/:*?"<>|]/g, ""));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Download className="size-4" />}
          הורדת PDF
        </button>
        <button className="btn-ghost mt-2 w-full" onClick={() => window.print()}>
          <Printer className="size-4" /> הדפסה
        </button>
      </div>

      <div className="card p-4">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
            <div className="mt-2 font-extrabold">ההצעה אושרה</div>
            <div className="text-sm text-stone-500">{approvedBy || name ? `ע״י ${approvedBy || name}` : ""} — תודה!</div>
          </div>
        ) : expired ? (
          <div className="text-center text-sm text-stone-600">
            <div className="font-bold">תוקף ההצעה פג</div>
            ליצירת קשר לעדכון ההצעה — ראו פרטים למטה.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              if (!agree) return setErr("יש לסמן אישור");
              start(async () => {
                const r = await approveByToken(token, name);
                if (r.error) setErr(r.error);
                else setDone(true);
              });
            }}
          >
            <div className="font-extrabold">אישור ההצעה</div>
            <p className="mt-0.5 text-sm text-stone-500">מאשרים? הקלידו שם מלא ולחצו אישור.</p>
            <input className="field mt-3" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="mt-3 flex items-start gap-2 text-sm text-stone-600">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--brand)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              קראתי ואני מאשר/ת את הצעת המחיר ותנאיה
            </label>
            {err ? <div className="mt-2 text-sm font-semibold text-rose-600">{err}</div> : null}
            <button className="btn mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={pending}>
              <CheckCircle2 className="size-4" /> {pending ? "שולח..." : "אני מאשר/ת את ההצעה"}
            </button>
          </form>
        )}
      </div>

      <div className="card p-4 text-sm">
        <div className="font-bold">יש שאלה?</div>
        <div className="text-stone-500">{contact.name}</div>
        <div className="mt-2 flex flex-col gap-1.5">
          {contact.phone ? (
            <a className="flex items-center gap-2 font-semibold text-brand" href={`tel:${contact.phone}`}>
              <Phone className="size-4" /> {contact.phone}
            </a>
          ) : null}
          {contact.email ? (
            <a className="flex items-center gap-2 font-semibold text-brand" href={`mailto:${contact.email}`}>
              <Mail className="size-4" /> {contact.email}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
