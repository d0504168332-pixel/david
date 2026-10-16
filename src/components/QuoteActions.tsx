"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Download, Mail, MessageCircle, Pencil, Printer, Share2, Trash2, CopyPlus, Check, Link2, RefreshCw, PlugZap, Bus, FileDown } from "lucide-react";
import { deleteQuote, duplicateQuote, markSent, resendWebhook, setQuoteStatus } from "@/app/actions/quotes";
import { downloadPdf, pdfFile } from "@/lib/pdf";
import { STATUS_LABEL, money, toIntlPhone } from "@/lib/quote";
import type { QuoteStatus } from "@/lib/types";

type Props = {
  id: string;
  token: string;
  status: QuoteStatus;
  number: string;
  businessName: string;
  authorName: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  total: number;
  docId: string;
  sync?: { label: string; ok?: boolean; at?: string; code?: number | null }[];
  tripCsv?: string | null;
  yitB64?: string | null;
  canRemind?: boolean;
};

export default function QuoteActions(p: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [origin, setOrigin] = useState("");
  const [, start] = useTransition();

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const f = new File(["x"], "x.pdf", { type: "application/pdf" });
      setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
    } catch {}
  }, []);

  const link = `${origin}/q/${p.token}`;
  const fileName = `הצעת מחיר ${p.number} - ${p.clientName}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  const node = () => document.getElementById(p.docId) as HTMLElement;
  const msg =
    `שלום ${p.clientName},\n` +
    `מצורפת הצעת מחיר מס׳ ${p.number} מ${p.businessName} על סך ${money(p.total)}.\n` +
    `לצפייה, הורדה ואישור ההצעה:\n${link}\n\n` +
    `בברכה,\n${p.authorName}`;

  const reminder =
    `שלום ${p.clientName},\n` +
    `רצינו לוודא שקיבלת את הצעת המחיר מס׳ ${p.number} מ${p.businessName}.\n` +
    `אפשר לצפות ולאשר כאן:\n${link}\n\n` +
    `נשמח לענות על כל שאלה,\n${p.authorName}`;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert("הפעולה נכשלה, נסו שוב");
    } finally {
      setBusy(null);
    }
  };

  const whatsapp = () => {
    const phone = toIntlPhone(p.clientPhone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
    start(() => markSent(p.id));
  };
  const email = () => {
    const url = `mailto:${p.clientEmail ?? ""}?subject=${encodeURIComponent(`הצעת מחיר ${p.number} – ${p.businessName}`)}&body=${encodeURIComponent(msg)}`;
    window.location.href = url;
    start(() => markSent(p.id));
  };

  return (
    <div className="no-print space-y-4">
      <div className="card p-4">
        <div className="mb-3 text-sm font-bold text-stone-500">שליחה ללקוח</div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn bg-[#25D366] text-white hover:brightness-105" onClick={whatsapp}>
            <MessageCircle className="size-4" /> וואטסאפ
          </button>
          <button className="btn-ghost" onClick={email}>
            <Mail className="size-4" /> מייל
          </button>
          <button className="btn-primary col-span-2" disabled={!!busy} onClick={() => run("pdf", () => downloadPdf(node(), fileName))}>
            {busy === "pdf" ? <Spinner /> : <Download className="size-4" />} הורדת PDF
          </button>
          {canShareFiles ? (
            <button
              className="btn-ghost col-span-2"
              disabled={!!busy}
              onClick={() =>
                run("share", async () => {
                  const f = await pdfFile(node(), fileName);
                  await navigator.share({ files: [f], title: fileName, text: msg });
                  start(() => markSent(p.id));
                })
              }
            >
              {busy === "share" ? <Spinner /> : <Share2 className="size-4" />} שיתוף קובץ PDF (וואטסאפ / מייל)
            </button>
          ) : null}
          <button
            className="btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />} {copied ? "הועתק" : "העתקת קישור"}
          </button>
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer className="size-4" /> הדפסה
          </button>
        </div>
        {p.canRemind ? (
          <button
            className="btn-ghost mt-2 w-full"
            onClick={() => window.open(`https://wa.me/${toIntlPhone(p.clientPhone)}?text=${encodeURIComponent(reminder)}`, "_blank", "noopener")}
          >
            <MessageCircle className="size-4" /> תזכורת בוואטסאפ
          </button>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          הלקוח מקבל קישור לדף מעוצב שבו אפשר לצפות, להוריד PDF ולאשר את ההצעה בלחיצה.
        </p>
      </div>

      <div className="card p-4">
        <div className="mb-2 text-sm font-bold text-stone-500">סטטוס</div>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => start(() => setQuoteStatus(p.id, s))}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${p.status === s ? "bg-ink text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {p.tripCsv ? (
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-500">
            <Bus className="size-4" /> הנסיעה
          </div>
          {p.yitB64 ? (
            <button
              className="btn-primary mb-2 w-full"
              onClick={() => {
                const bin = atob(p.yitB64!);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                const url = URL.createObjectURL(new Blob([bytes], { type: "text/plain;charset=windows-1255" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `YIT_${p.number}.txt`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 2000);
              }}
            >
              <FileDown className="size-4" /> קובץ לייבוא ל-YIT
            </button>
          ) : null}
          <button
            className="btn-ghost w-full"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([p.tripCsv!], { type: "text/csv;charset=utf-8" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = `trip-${p.number}.csv`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            }}
          >
            <FileDown className="size-4" /> קובץ לאקסל (CSV)
          </button>
        </div>
      ) : null}

      {p.sync?.length ? (
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-500">
            <PlugZap className="size-4" /> שליחה אוטומטית באישור
          </div>
          <ul className="space-y-1.5 text-sm">
            {p.sync.map((s) => (
              <li key={s.label}>
                <div className="truncate text-stone-600">{s.label}</div>
                {!s.at ? (
                  <div className="text-xs text-stone-400">יישלח כשההצעה תאושר</div>
                ) : s.ok ? (
                  <div className="text-xs font-semibold text-emerald-700">נשלח ✓ · {new Date(s.at).toLocaleString("he-IL")}</div>
                ) : (
                  <div className="text-xs font-semibold text-rose-700">נכשל{s.code ? ` (${s.code})` : ""} · {new Date(s.at).toLocaleString("he-IL")}</div>
                )}
              </li>
            ))}
          </ul>
          {p.status === "approved" ? (
            <button className="btn-ghost mt-3 w-full" onClick={() => start(async () => { await resendWebhook(p.id); })}>
              <RefreshCw className="size-4" /> שליחה חוזרת
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="card grid grid-cols-2 gap-2 p-4">
        <Link href={`/quotes/${p.id}/edit`} className="btn-ghost">
          <Pencil className="size-4" /> עריכה
        </Link>
        <button className="btn-ghost" onClick={() => start(() => duplicateQuote(p.id))}>
          <CopyPlus className="size-4" /> שכפול
        </button>
        <a href={link} target="_blank" className="btn-ghost col-span-2" rel="noreferrer">
          <Copy className="size-4" /> צפייה כמו הלקוח
        </a>
        {confirmDel ? (
          <div className="col-span-2 flex gap-2">
            <button className="btn-danger flex-1" onClick={() => start(() => deleteQuote(p.id))}>
              כן, למחוק
            </button>
            <button className="btn-ghost flex-1" onClick={() => setConfirmDel(false)}>
              ביטול
            </button>
          </div>
        ) : (
          <button className="btn-danger col-span-2" onClick={() => setConfirmDel(true)}>
            <Trash2 className="size-4" /> מחיקת ההצעה
          </button>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}
