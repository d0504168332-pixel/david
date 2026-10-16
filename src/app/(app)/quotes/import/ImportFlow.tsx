"use client";

import { useState, useTransition, type ComponentProps } from "react";
import { Sparkles, Wand2, Info, RotateCcw, ClipboardPaste } from "lucide-react";
import QuoteEditor from "@/components/QuoteEditor";
import { parseEmailRequest, type ImportResult } from "@/app/actions/import";
import type { Quote } from "@/lib/types";

type EditorProps = ComponentProps<typeof QuoteEditor>;

const EXAMPLE = `שלום רב,
שמי מיכל לוי מחברת קפה נחת בע"מ.
נשמח לקבל הצעת מחיר עבור:
- עיצוב לוגו
- 500 כרטיסי ביקור
- שלט חוץ 2x1 מטר
אנחנו צריכים את זה עד סוף החודש.

בברכה,
מיכל לוי
קפה נחת בע"מ
052-7654321
michal@nachat.co.il`;

export default function ImportFlow({ aiEnabled, ...editor }: Omit<EditorProps, "initial" | "priceSources"> & { aiEnabled: boolean }) {
  const [text, setText] = useState("");
  const [res, setRes] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const [run, setRun] = useState(0);

  if (res?.draft) {
    const d = res.draft;
    const missing = d.items.filter((i) => !i.unit_price).length;
    const initial = {
      client_id: res.client_id ?? null,
      title: d.title,
      client_name: d.client_name,
      client_contact: d.client_contact,
      client_phone: d.client_phone,
      client_email: d.client_email,
      client_address: d.client_address,
      items: d.items.map(({ price_source: _ps, ...i }) => i),
      ...(d.trip ? { meta: { trip: d.trip } } : {}),
    } as unknown as Quote;
    const priceSources = Object.fromEntries(d.items.filter((i) => i.price_source).map((i) => [i.id, i.price_source!]));
    return (
      <div>
        <div className="no-print mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            <div className="flex items-center gap-2 font-extrabold">
              <Sparkles className="size-4" /> ההצעה נבנתה מהמייל
              {res.client_id ? <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold ring-1 ring-sky-200">לקוח קיים זוהה</span> : null}
            </div>
            <div className="mt-1">
              {d.items.length} פריטים זוהו.{" "}
              {missing ? <b>נשאר להזין מחיר ל-{missing} {missing === 1 ? "פריט" : "פריטים"} (מסומנים בכתום).</b> : "לכל הפריטים הוצע מחיר מהצעות קודמות — בדקו ושמרו."}
            </div>
            {d.hints ? (
              <div className="mt-2 flex gap-2 rounded-xl bg-white/70 p-2.5 text-sky-950">
                <Info className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="text-xs font-bold">מידע מהמייל (לא מופיע בהצעה)</div>
                  <div className="whitespace-pre-wrap">{d.hints}</div>
                </div>
              </div>
            ) : null}
          </div>
          <button className="btn-ghost self-start" onClick={() => setRes(null)}>
            <RotateCcw className="size-4" /> מייל אחר
          </button>
        </div>
        <QuoteEditor key={run} {...editor} initial={initial} priceSources={priceSources} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0" htmlFor="email-text">הטקסט של הבקשה</label>
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            onClick={async () => {
              try {
                setText(await navigator.clipboard.readText());
              } catch {}
            }}
          >
            <ClipboardPaste className="size-4" /> הדבקה מהלוח
          </button>
        </div>
        <textarea
          id="email-text"
          className="field min-h-[22rem] font-[inherit] leading-relaxed"
          placeholder="הדביקו כאן מייל, הודעת וואטסאפ או כל טקסט של בקשה. לדוגמה: הלקוח רוצה 10 כרטיסי ביקור ו-2 באנרים"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {res?.error ? <div className="mt-3 text-sm font-semibold text-rose-600">{res.error}</div> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="btn-primary px-5 py-3"
            disabled={pending || text.trim().length < 10}
            onClick={() =>
              start(async () => {
                const r = await parseEmailRequest(text);
                setRes(r);
                setRun((x) => x + 1);
              })
            }
          >
            {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Wand2 className="size-4" />}
            {pending ? "בונה הצעה..." : "בנה הצעת מחיר"}
          </button>
          <button type="button" className="text-sm font-semibold text-stone-500 hover:text-ink" onClick={() => setText(EXAMPLE)}>
            מייל לדוגמה
          </button>
        </div>
      </div>
      <aside className="card h-fit p-5 text-sm text-stone-600">
        <div className="mb-2 font-extrabold text-ink">איך זה עובד</div>
        <ol className="list-inside list-decimal space-y-1.5">
          <li>מעתיקים את מייל הבקשה ומדביקים.</li>
          <li>המערכת מזהה את הלקוח, פרטי הקשר והפריטים המבוקשים (כולל כמויות).</li>
          <li>פריט שכבר תמחרתם בעבר — מקבל אוטומטית את המחיר הקודם.</li>
          <li>משלימים מחירים במקומות המסומנים בכתום ושומרים.</li>
        </ol>
        <div className={`mt-4 rounded-xl p-3 text-xs ${aiEnabled ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
          {aiEnabled ? "זיהוי חכם (AI) פעיל — מבין גם מיילים חופשיים ולא מסודרים." : "זיהוי בסיסי פעיל — עובד הכי טוב כשהפריטים במייל מופיעים כרשימה. ניתן להפעיל זיהוי חכם (AI)."}
        </div>
      </aside>
    </div>
  );
}
