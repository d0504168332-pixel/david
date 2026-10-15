"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, ExternalLink } from "lucide-react";

export default function ShareRequestLink({ link, businessName }: { link: string; businessName: string }) {
  const [copied, setCopied] = useState(false);
  const msg = `שלום, לקבלת הצעת מחיר מ${businessName} אפשר למלא כאן את הפרטים: ${link}`;
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">הקישור שלכם לבקשת הצעת מחיר</div>
        <div className="mt-0.5 truncate text-sm text-stone-500" dir="ltr" style={{ textAlign: "right" }}>{link}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {}
          }}
        >
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {copied ? "הועתק" : "העתקה"}
        </button>
        <a className="btn bg-[#25D366] text-white" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(msg)}`}>
          <MessageCircle className="size-4" /> שליחה בוואטסאפ
        </a>
        <a className="btn-ghost" target="_blank" rel="noreferrer" href={link}>
          <ExternalLink className="size-4" /> תצוגה
        </a>
      </div>
    </div>
  );
}
