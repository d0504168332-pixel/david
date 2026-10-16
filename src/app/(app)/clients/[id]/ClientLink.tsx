"use client";

import { useEffect, useState } from "react";
import { Check, Link2, MessageCircle, UserCheck } from "lucide-react";
import { toIntlPhone } from "@/lib/quote";

/** קישור אישי ללקוח קבוע — הפרטים שלו ממולאים אוטומטית בטופס הבקשה */
export default function ClientLink({ path, name, phone, businessName }: { path: string; name: string; phone: string | null; businessName: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}${path}`;
  const msg = `שלום ${name},\nזה הקישור האישי שלך לבקשת הצעת מחיר מ${businessName} — הפרטים שלך כבר ממולאים, נשאר רק למלא את פרטי הנסיעה:\n${url}\nכדאי לשמור אותו 🙂`;
  return (
    <div className="card mb-5 flex flex-wrap items-center gap-3 p-4">
      <UserCheck className="size-5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <div className="font-bold">קישור אישי לבקשות</div>
        <div className="text-sm text-stone-500">הלקוח נכנס, והפרטים שלו כבר ממולאים. הבקשה נכנסת משויכת אליו.</div>
      </div>
      <button
        className="btn-ghost"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {}
        }}
      >
        {copied ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />} {copied ? "הועתק" : "העתקת קישור"}
      </button>
      <a className="btn bg-[#25D366] text-white" target="_blank" rel="noreferrer" href={`https://wa.me/${toIntlPhone(phone)}?text=${encodeURIComponent(msg)}`}>
        <MessageCircle className="size-4" /> שליחה בוואטסאפ
      </a>
    </div>
  );
}
