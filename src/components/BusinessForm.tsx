"use client";

import { useActionState, useState } from "react";
import { ImagePlus, Bus, Briefcase } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import QuoteDocument from "@/components/doc/QuoteDocument";
import DocPreview from "@/components/doc/DocPreview";
import type { FormState } from "@/app/actions/auth";
import type { Business, TemplateId } from "@/lib/types";
import type { DocAuthor } from "@/components/doc/QuoteDocument";
import { addDays, todayStr } from "@/lib/quote";

type Action = (s: FormState, f: FormData) => Promise<FormState>;

const TEMPLATES: { id: TemplateId; label: string; desc: string }[] = [
  { id: "modern", label: "מודרני", desc: "פס צבע עליון, נקי ומקצועי" },
  { id: "classic", label: "קלאסי", desc: "נייר מכתבים אלגנטי, גופן סריפי" },
  { id: "minimal", label: "מינימליסטי", desc: "הרבה אוויר, קווים דקים" },
  { id: "bold", label: "נועז", desc: "בלוק צבע בולט וכותרת חזקה" },
];

const PALETTE = ["#16263F", "#1f3a5f", "#0f766e", "#7c2d12", "#4c1d95", "#111827", "#9f1239", "#1d4ed8", "#365314"];
const ACCENTS = ["#F2A93B", "#c8a35a", "#f59e0b", "#14b8a6", "#e11d48", "#a3a3a3", "#84cc16"];

export default function BusinessForm({
  action,
  business,
  hidden,
  submitLabel = "שמירת פרטי העסק",
  previewAuthor,
  canChangeType = false,
}: {
  action: Action;
  business?: Partial<Business> | null;
  hidden?: Record<string, string>;
  submitLabel?: string;
  previewAuthor?: DocAuthor | null;
  /** רק מנהל המערכת קובע אם זה עסק הסעות או עסק אחר */
  canChangeType?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [v, setV] = useState({
    name: business?.name ?? "",
    address: business?.address ?? "",
    phone: business?.phone ?? "",
    email: business?.email ?? "",
    website: business?.website ?? "",
    tax_id: business?.tax_id ?? "",
    primary_color: business?.primary_color ?? "#16263F",
    accent_color: business?.accent_color ?? "#F2A93B",
    template: (business?.template ?? "modern") as TemplateId,
    quote_prefix: business?.quote_prefix ?? "Q-",
    show_tax_id: business?.show_tax_id ?? true,
    show_website: business?.show_website ?? true,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(business?.logo_url ?? null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [bizType, setBizType] = useState<"general" | "transport" | null>((business?.business_type as "general" | "transport" | undefined) ?? null);
  const isTransport = bizType === "transport";
  const set = (k: keyof typeof v, val: string | boolean) => setV((p) => ({ ...p, [k]: val }));

  const today = todayStr();
  const sample = {
    number: business?.quote_start_number ?? 1001,
    title: "הצעה לדוגמה",
    client_name: "לקוח לדוגמה בע״מ",
    client_contact: "ישראל ישראלי",
    client_phone: "050-0000000",
    client_email: null,
    client_address: "תל אביב",
    client_tax_id: null,
    issue_date: today,
    valid_until: addDays(today, 30),
    items: [
      { id: "a", description: "שירות או מוצר ראשון", details: "פירוט קצר של מה שכלול", quantity: 1, unit_price: 4500 },
      { id: "b", description: "שירות נוסף", quantity: 3, unit_price: 850 },
    ],
    discount_type: "percent" as const,
    discount_value: 0,
    vat_enabled: true,
    vat_rate: Number(business?.vat_rate ?? 18),
    notes: null,
    terms: business?.default_terms ?? null,
    status: "draft" as const,
    approved_by_name: null,
    approved_at: null,
  };
  const author: DocAuthor = previewAuthor ?? {
    full_name: "ישראל כהן",
    job_title: "מנכ״ל",
    phone: v.phone || "050-1234567",
    email: v.email || "info@example.co.il",
    signature_style: "amatic",
    signature_image: null,
    signature_color: "#1e3a8a",
    stamp_color: "#1d4ed8",
    stamp_shape: "modern",
    show_signature: true,
    show_stamp: true,
  };

  // פתיחת עסק חדש: קודם כל שואלים איזה סוג עסק זה
  if (!bizType) {
    return (
      <div className="card mx-auto max-w-3xl p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">איזה סוג עסק זה?</h2>
        <p className="mt-1 text-stone-500">הבחירה קובעת אילו כלים יקבל העסק. אפשר לשנות אחר כך בהגדרות.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <TypeCard
            title="חברת הסעות"
            desc="הצעות מחיר להסעות עם פרטי נסיעה, טופס בקשת נסיעה ללקוחות, קליטת בקשות במייל, ובאישור — מייל לסדרן וקובץ לייבוא ל-YIT."
            icon={<Bus className="size-7" />}
            onClick={() => setBizType("transport")}
          />
          <TypeCard
            title="עסק אחר"
            desc="הפקת הצעות מחיר מעוצבות: לקוחות, פריטים, חתימה וחותמת, PDF ושליחה בוואטסאפ ובמייל."
            icon={<Briefcase className="size-7" />}
            onClick={() => setBizType("general")}
          />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
      {hidden ? Object.entries(hidden).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />) : null}
      {canChangeType ? <input type="hidden" name="business_type" value={bizType} /> : null}
      <div className="space-y-5">
        <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">{isTransport ? <Bus className="size-5" /> : <Briefcase className="size-5" />}</div>
            <div>
              <div className="text-xs font-semibold text-stone-500">סוג העסק</div>
              <div className="font-extrabold">{isTransport ? "חברת הסעות" : "עסק כללי — הצעות מחיר"}</div>
            </div>
          </div>
          {canChangeType ? (
            <div className="flex rounded-xl bg-stone-100 p-1">
              {(["transport", "general"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setBizType(t)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${bizType === t ? "bg-white shadow-sm" : "text-stone-500"}`}>
                  {t === "transport" ? "הסעות" : "אחר"}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-[17px] font-extrabold">פרטי העסק</h2>
          <div className="mb-5 flex items-center gap-4">
            <label className="group relative grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 transition hover:border-brand">
              {logoPreview && !removeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="לוגו" className="size-full object-contain p-2" />
              ) : (
                <div className="text-center text-stone-400 group-hover:text-brand">
                  <ImagePlus className="mx-auto size-6" />
                  <div className="mt-1 text-[11px] font-semibold">העלאת לוגו</div>
                </div>
              )}
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setLogoPreview(URL.createObjectURL(f));
                    setRemoveLogo(false);
                  }
                }}
              />
            </label>
            <div className="text-sm text-stone-500">
              PNG / JPG / SVG עד 3MB. מומלץ לוגו על רקע שקוף.
              {logoPreview ? (
                <label className="mt-2 flex items-center gap-2 font-semibold text-stone-600">
                  <input type="checkbox" name="remove_logo" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} className="size-4" />
                  הסרת הלוגו
                </label>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <In label="שם העסק *" name="name" value={v.name} onChange={(x) => set("name", x)} required />
            <In label="ח.פ. / ע.מ." name="tax_id" value={v.tax_id} onChange={(x) => set("tax_id", x)} />
            <In label="כתובת" name="address" value={v.address} onChange={(x) => set("address", x)} />
            <In label="טלפון" name="phone" value={v.phone} onChange={(x) => set("phone", x)} ltr />
            <In label="אימייל" name="email" value={v.email} onChange={(x) => set("email", x)} ltr type="email" />
            <In label="אתר" name="website" value={v.website} onChange={(x) => set("website", x)} ltr />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-stone-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="show_tax_id" checked={v.show_tax_id} onChange={(e) => set("show_tax_id", e.target.checked)} className="size-4 accent-[var(--brand)]" />
              הצגת ח.פ. במסמך
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="show_website" checked={v.show_website} onChange={(e) => set("show_website", e.target.checked)} className="size-4 accent-[var(--brand)]" />
              הצגת אתר במסמך
            </label>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-[17px] font-extrabold">עיצוב ההצעה</h2>
          <input type="hidden" name="template" value={v.template} />
          <div className="grid grid-cols-2 gap-2.5">
            {TEMPLATES.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => set("template", t.id)}
                className={`rounded-xl border-2 p-3 text-right transition ${v.template === t.id ? "border-brand bg-brand/5" : "border-stone-200 hover:border-stone-300"}`}
              >
                <TemplateThumb id={t.id} color={v.primary_color} accent={v.accent_color} />
                <div className="mt-2 font-bold">{t.label}</div>
                <div className="text-xs text-stone-500">{t.desc}</div>
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ColorPick label="צבע ראשי" name="primary_color" value={v.primary_color} onChange={(x) => set("primary_color", x)} options={PALETTE} />
            <ColorPick label="צבע הדגשה" name="accent_color" value={v.accent_color} onChange={(x) => set("accent_color", x)} options={ACCENTS} />
          </div>
        </section>

        {isTransport ? (
        <section className="card p-5">
          <h2 className="mb-1 text-[17px] font-extrabold">טופס בקשת נסיעה ללקוחות</h2>
          <p className="mb-4 text-sm text-stone-500">הלקוח ממלא בקישור מוצא, יעד, תאריך, שעה ונוסעים — והבקשה מגיעה ל"בקשות מלקוחות".</p>
          <label className="label" htmlFor="request_intro">טקסט פתיחה בטופס</label>
          <textarea id="request_intro" name="request_intro" defaultValue={business?.request_intro ?? ""} placeholder="ספרו לנו לאן נוסעים — ונחזור אליכם עם הצעת מחיר מסודרת." className="field min-h-16" />
        </section>
        ) : null}

        {isTransport ? (
        <section className="card p-5">
          <h2 className="mb-1 text-[17px] font-extrabold">כשהצעה מאושרת</h2>
          <p className="mb-4 text-sm text-stone-500">
            כשלקוח מאשר הצעה, המערכת שולחת את כל פרטי ההצעה (לקוח, פריטים, סכומים ופרטי נסיעה) לכתובת הזו — למשל כדי לפתוח נסיעה אוטומטית במערכת ההסעות.
          </p>
          <label className="label" htmlFor="ops_emails">מייל לסידור הנסיעה (סדרן / ספק / מערכת YIT)</label>
          <input id="ops_emails" name="ops_emails" dir="ltr" defaultValue={business?.ops_emails ?? ""} placeholder="dispatch@company.co.il, manager@company.co.il" className="field text-right" />
          <p className="mb-4 mt-1.5 text-xs text-stone-500">כשלקוח מאשר הצעה — נשלח לכתובות האלה מייל עם כל פרטי הנסיעה וקובץ מוכן לייבוא. אפשר כמה כתובות, מופרדות בפסיק.</p>
          <label className="label" htmlFor="webhook_url">כתובת קליטה (Webhook URL)</label>
          <input id="webhook_url" name="webhook_url" dir="ltr" defaultValue={business?.webhook_url ?? ""} placeholder="https://..." className="field text-right" />
          {business?.webhook_secret ? (
            <div className="mt-3 text-xs text-stone-500">
              מפתח חתימה לאימות (נשלח בכותרת X-QuoteCraft-Signature):{" "}
              <code dir="ltr" className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-700">{business.webhook_secret}</code>
            </div>
          ) : null}
        </section>
        ) : null}

        <section className="card p-5">
          <h2 className="mb-4 text-[17px] font-extrabold">ברירות מחדל להצעות</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <In label="קידומת מספר" name="quote_prefix" value={v.quote_prefix} onChange={(x) => set("quote_prefix", x)} ltr />
            <div>
              <label className="label">מספר התחלתי</label>
              <input name="quote_start_number" type="number" min={1} defaultValue={business?.quote_start_number ?? 1001} className="field" />
            </div>
            <div>
              <label className="label">מע״מ %</label>
              <input name="vat_rate" type="number" step="any" min={0} max={100} defaultValue={business?.vat_rate ?? 18} className="field" />
            </div>
          </div>
          <label className="label mt-3">הערות ברירת מחדל</label>
          <textarea name="default_notes" defaultValue={business?.default_notes ?? ""} className="field min-h-16" />
          <label className="label mt-3">תנאים ברירת מחדל</label>
          <textarea
            name="default_terms"
            defaultValue={business?.default_terms ?? "ההצעה בתוקף ל-30 יום מתאריך הפקתה.\nתנאי תשלום: שוטף + 30."}
            className="field min-h-24"
          />
        </section>

        <div className="no-print sticky bottom-20 z-10 lg:bottom-4">
          <div className="card flex flex-wrap items-center gap-3 p-3 shadow-lg">
            <SubmitButton>{submitLabel}</SubmitButton>
            <FormMessage state={state} />
          </div>
        </div>
      </div>

      <div className="hidden xl:block">
        <div className="sticky top-6">
          <div className="mb-2 text-sm font-semibold text-stone-500">כך תיראה ההצעה</div>
          <div className="rounded-2xl bg-stone-200/50 p-5">
            <DocPreview>
              <QuoteDocument
                business={{ ...v, name: v.name || "שם העסק", logo_url: removeLogo ? null : logoPreview }}
                author={author}
                quote={sample}
              />
            </DocPreview>
          </div>
        </div>
      </div>
    </form>
  );
}

function In({ label, name, value, onChange, ltr, type = "text", required }: { label: string; name: string; value: string; onChange: (v: string) => void; ltr?: boolean; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} dir={ltr ? "ltr" : undefined} className={`field ${ltr ? "text-right" : ""}`} />
    </div>
  );
}

function ColorPick({ label, name, value, onChange, options }: { label: string; name: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            aria-label={c}
            className={`size-8 rounded-full ring-offset-2 transition ${value.toLowerCase() === c ? "ring-2 ring-ink" : "hover:scale-110"}`}
            style={{ background: c }}
          />
        ))}
        <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-stone-300 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title="צבע מותאם">
          <input type="color" name={name} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  );
}

function TemplateThumb({ id, color, accent }: { id: TemplateId; color: string; accent: string }) {
  return (
    <div className="relative h-20 overflow-hidden rounded-lg border border-stone-200 bg-white">
      {id === "modern" ? (
        <>
          <div className="h-6" style={{ background: color }} />
          <div className="h-[3px]" style={{ background: accent }} />
        </>
      ) : null}
      {id === "classic" ? (
        <div className="px-3 pt-2 text-center">
          <div className="mx-auto h-2 w-10 rounded" style={{ background: color }} />
          <div className="mt-1.5 h-[3px] border-y" style={{ borderColor: color }} />
        </div>
      ) : null}
      {id === "minimal" ? (
        <div className="flex justify-between px-3 pt-3">
          <div className="h-2 w-8 rounded" style={{ background: color }} />
          <div className="h-2.5 w-12 rounded bg-stone-300" />
        </div>
      ) : null}
      {id === "bold" ? <div className="absolute left-0 top-0 h-9 w-14 rounded-br-xl" style={{ background: color }} /> : null}
      <div className="absolute inset-x-3 bottom-3 space-y-1">
        <div className="h-1.5 rounded" style={{ background: id === "minimal" ? "#e7e5e4" : color, opacity: id === "minimal" ? 1 : 0.85 }} />
        <div className="h-1 w-4/5 rounded bg-stone-200" />
        <div className="h-1 w-3/5 rounded bg-stone-200" />
      </div>
    </div>
  );
}

function TypeCard({ title, desc, icon, onClick }: { title: string; desc: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border-2 border-stone-200 p-5 text-right transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">{icon}</div>
      <div className="mt-4 text-lg font-extrabold">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-stone-500">{desc}</div>
    </button>
  );
}
