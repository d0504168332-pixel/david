"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, PencilLine, Plus, Save, Trash2, AlignRight } from "lucide-react";
import QuoteDocument, { type DocAuthor, type DocBusiness } from "@/components/doc/QuoteDocument";
import DocPreview from "@/components/doc/DocPreview";
import { saveQuote, type QuoteInput } from "@/app/actions/quotes";
import { addDays, calcTotals, money, newItem, todayStr, STATUS_LABEL } from "@/lib/quote";
import type { Client, Quote, QuoteItem, QuoteStatus } from "@/lib/types";

type Props = {
  business: DocBusiness & { vat_rate: number; default_notes: string | null; default_terms: string | null };
  author: DocAuthor | null;
  clients: Client[];
  initial?: Quote | null;
};

export default function QuoteEditor({ business, author, clients, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  const today = todayStr();
  const [q, setQ] = useState<QuoteInput>(() => ({
    id: initial?.id,
    client_id: initial?.client_id ?? null,
    save_client: !initial?.id && !initial?.client_id,
    title: initial?.title ?? "",
    client_name: initial?.client_name ?? "",
    client_contact: initial?.client_contact ?? "",
    client_phone: initial?.client_phone ?? "",
    client_email: initial?.client_email ?? "",
    client_address: initial?.client_address ?? "",
    client_tax_id: initial?.client_tax_id ?? "",
    issue_date: initial?.issue_date ?? today,
    valid_until: initial?.id ? initial.valid_until : addDays(today, 30),
    status: initial?.status ?? "draft",
    items: initial?.items?.length ? initial.items : [newItem()],
    discount_type: initial?.discount_type ?? "percent",
    discount_value: initial?.discount_value ?? 0,
    vat_enabled: initial?.vat_enabled ?? true,
    vat_rate: initial?.vat_rate ?? business.vat_rate ?? 18,
    notes: initial?.notes ?? business.default_notes ?? "",
    terms: initial?.terms ?? business.default_terms ?? "",
  }));
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((initial?.items ?? []).filter((i) => i.details).map((i) => [i.id, true]))
  );

  const set = <K extends keyof QuoteInput>(k: K, v: QuoteInput[K]) => setQ((p) => ({ ...p, [k]: v }));
  const setItem = (id: string, patch: Partial<QuoteItem>) =>
    setQ((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const moveItem = (idx: number, dir: -1 | 1) =>
    setQ((p) => {
      const items = [...p.items];
      const j = idx + dir;
      if (j < 0 || j >= items.length) return p;
      [items[idx], items[j]] = [items[j], items[idx]];
      return { ...p, items };
    });

  const totals = useMemo(() => calcTotals(q), [q]);

  const pickClient = (id: string) => {
    if (!id) {
      setQ((p) => ({ ...p, client_id: null, save_client: true }));
      return;
    }
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setQ((p) => ({
      ...p,
      client_id: c.id,
      save_client: false,
      client_name: c.name,
      client_contact: c.contact_name ?? "",
      client_phone: c.phone ?? "",
      client_email: c.email ?? "",
      client_address: c.address ?? "",
      client_tax_id: c.tax_id ?? "",
    }));
  };

  const onSave = () => {
    setError(null);
    start(async () => {
      const res = await saveQuote(q);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/quotes/${res.id}`);
      router.refresh();
    });
  };

  const docQuote = {
    ...q,
    number: initial?.number ?? null,
    title: q.title || null,
    client_contact: q.client_contact || null,
    client_phone: q.client_phone || null,
    client_email: q.client_email || null,
    client_address: q.client_address || null,
    client_tax_id: q.client_tax_id || null,
    notes: q.notes || null,
    terms: q.terms || null,
    approved_by_name: initial?.approved_by_name ?? null,
    approved_at: initial?.approved_at ?? null,
  };

  return (
    <div>
      {/* מובייל: מעבר בין עריכה לתצוגה */}
      <div className="no-print mb-4 grid grid-cols-2 gap-1 rounded-xl bg-stone-200/60 p-1 xl:hidden">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold ${mobileTab === t ? "bg-white shadow-sm" : "text-stone-600"}`}
          >
            {t === "edit" ? <PencilLine className="size-4" /> : <Eye className="size-4" />}
            {t === "edit" ? "עריכה" : "תצוגה מקדימה"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ---------- טופס ---------- */}
        <div className={`space-y-5 ${mobileTab === "preview" ? "hidden xl:block" : ""}`}>
          <Section title="לקוח" step={1}>
            {clients.length > 0 ? (
              <div className="mb-4">
                <label className="label">בחירה מלקוחות שמורים</label>
                <select className="field" value={q.client_id ?? ""} onChange={(e) => pickClient(e.target.value)}>
                  <option value="">+ לקוח חדש</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.contact_name ? ` — ${c.contact_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="שם הלקוח / החברה *" value={q.client_name} onChange={(v) => set("client_name", v)} />
              <Field label="איש קשר" value={q.client_contact} onChange={(v) => set("client_contact", v)} />
              <Field label="טלפון" value={q.client_phone} onChange={(v) => set("client_phone", v)} ltr type="tel" />
              <Field label="אימייל" value={q.client_email} onChange={(v) => set("client_email", v)} ltr type="email" />
              <Field label="כתובת" value={q.client_address} onChange={(v) => set("client_address", v)} />
              <Field label="ח.פ. / ע.מ." value={q.client_tax_id} onChange={(v) => set("client_tax_id", v)} />
            </div>
            {!q.client_id ? (
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-stone-600">
                <input type="checkbox" checked={q.save_client} onChange={(e) => set("save_client", e.target.checked)} className="size-4 accent-[var(--brand)]" />
                לשמור את הלקוח לרשימת הלקוחות
              </label>
            ) : null}
          </Section>

          <Section title="פרטי ההצעה" step={2}>
            <Field label="נושא ההצעה (הנדון)" value={q.title} onChange={(v) => set("title", v)} placeholder="לדוגמה: עיצוב ובניית אתר תדמית" />
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">תאריך</label>
                <input type="date" className="field" value={q.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
              </div>
              <div>
                <label className="label">בתוקף עד</label>
                <input type="date" className="field" value={q.valid_until ?? ""} onChange={(e) => set("valid_until", e.target.value || null)} />
                <div className="mt-1.5 flex gap-1">
                  {[14, 30, 60].map((d) => (
                    <button key={d} type="button" onClick={() => set("valid_until", addDays(q.issue_date, d))} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 hover:bg-stone-200">
                      {d} יום
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">סטטוס</label>
                <select className="field" value={q.status} onChange={(e) => set("status", e.target.value as QuoteStatus)}>
                  {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          <Section title="פריטים ושירותים" step={3}>
            <div className="space-y-3">
              {q.items.map((it, idx) => (
                <div key={it.id} className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">{idx + 1}</span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <input className="field" placeholder="תיאור הפריט / השירות" value={it.description} onChange={(e) => setItem(it.id, { description: e.target.value })} />
                      {openDetails[it.id] ? (
                        <textarea className="field min-h-16 text-sm" placeholder="פירוט נוסף (אופציונלי)" value={it.details ?? ""} onChange={(e) => setItem(it.id, { details: e.target.value })} />
                      ) : null}
                      <div className="grid grid-cols-[1fr_1.3fr_1.3fr] gap-2">
                        <div>
                          <label className="text-[11.5px] font-semibold text-stone-500">כמות</label>
                          <input type="number" inputMode="decimal" min={0} step="any" className="field" value={it.quantity} onChange={(e) => setItem(it.id, { quantity: e.target.valueAsNumber || 0 })} />
                        </div>
                        <div>
                          <label className="text-[11.5px] font-semibold text-stone-500">מחיר ליחידה ₪</label>
                          <input type="number" inputMode="decimal" min={0} step="any" className="field" value={it.unit_price} onChange={(e) => setItem(it.id, { unit_price: e.target.valueAsNumber || 0 })} />
                        </div>
                        <div>
                          <label className="text-[11.5px] font-semibold text-stone-500">סה״כ</label>
                          <div className="field bg-stone-100/70 font-bold tabular-nums">{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <IconBtn title="פירוט" onClick={() => setOpenDetails((p) => ({ ...p, [it.id]: !p[it.id] }))}>
                        <AlignRight className="size-4" />
                      </IconBtn>
                      <IconBtn title="למעלה" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="size-4" />
                      </IconBtn>
                      <IconBtn title="למטה" onClick={() => moveItem(idx, 1)} disabled={idx === q.items.length - 1}>
                        <ArrowDown className="size-4" />
                      </IconBtn>
                      <IconBtn title="מחיקה" danger onClick={() => setQ((p) => ({ ...p, items: p.items.filter((x) => x.id !== it.id) }))} disabled={q.items.length === 1}>
                        <Trash2 className="size-4" />
                      </IconBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setQ((p) => ({ ...p, items: [...p.items, newItem()] }))} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 py-3 text-sm font-bold text-stone-600 transition hover:border-brand hover:text-brand">
              <Plus className="size-4" /> הוספת פריט
            </button>
          </Section>

          <Section title="הנחה ומע״מ" step={4}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">הנחה</label>
                <div className="flex gap-2">
                  <div className="flex shrink-0 rounded-xl bg-stone-100 p-1">
                    {(["percent", "amount"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => set("discount_type", t)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${q.discount_type === t ? "bg-white shadow-sm" : "text-stone-500"}`}>
                        {t === "percent" ? "%" : "₪"}
                      </button>
                    ))}
                  </div>
                  <input type="number" min={0} step="any" className="field" value={q.discount_value} onChange={(e) => set("discount_value", e.target.valueAsNumber || 0)} />
                </div>
              </div>
              <div>
                <label className="label">מע״מ</label>
                <div className="flex items-center gap-3">
                  <Toggle checked={q.vat_enabled} onChange={(v) => set("vat_enabled", v)} />
                  <input type="number" min={0} max={100} step="any" className="field w-24" value={q.vat_rate} disabled={!q.vat_enabled} onChange={(e) => set("vat_rate", e.target.valueAsNumber || 0)} />
                  <span className="text-sm text-stone-500">%</span>
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-1.5 rounded-xl bg-stone-50 p-4 text-sm">
              <Line label="סכום ביניים" value={money(totals.subtotal)} />
              {totals.discount > 0 ? <Line label="הנחה" value={`- ${money(totals.discount)}`} /> : null}
              {q.vat_enabled ? <Line label={`מע״מ ${q.vat_rate}%`} value={money(totals.vat)} /> : null}
              <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-extrabold">
                <span>סה״כ לתשלום</span>
                <span className="tabular-nums">{money(totals.total)}</span>
              </div>
            </div>
          </Section>

          <Section title="הערות ותנאים" step={5}>
            <label className="label">הערות</label>
            <textarea className="field min-h-20" value={q.notes} onChange={(e) => set("notes", e.target.value)} placeholder="מידע נוסף ללקוח" />
            <label className="label mt-3">תנאים</label>
            <textarea className="field min-h-28" value={q.terms} onChange={(e) => set("terms", e.target.value)} />
          </Section>
        </div>

        {/* ---------- תצוגה מקדימה ---------- */}
        <div className={`${mobileTab === "edit" ? "hidden xl:block" : ""}`}>
          <div className="xl:sticky xl:top-6">
            <div className="mb-2 flex items-center justify-between text-sm text-stone-500">
              <span className="font-semibold">תצוגה מקדימה חיה</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
            <div className="max-h-[calc(100vh-7rem)] overflow-auto rounded-2xl bg-stone-200/50 p-3 sm:p-5">
              <DocPreview>
                <QuoteDocument business={business} author={author} quote={docQuote} />
              </DocPreview>
            </div>
          </div>
        </div>
      </div>

      {/* סרגל שמירה */}
      <div className="no-print sticky bottom-20 z-20 mt-6 lg:bottom-4">
        <div className="card flex items-center justify-between gap-3 p-3 shadow-lg">
          <div className="min-w-0 text-sm">
            {error ? <span className="font-semibold text-rose-600">{error}</span> : <span className="text-stone-500">סה״כ: <b className="text-ink tabular-nums">{money(totals.total)}</b></span>}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={() => router.back()}>ביטול</button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={pending}>
              {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="size-4" />}
              שמירה והמשך
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2.5 text-[17px] font-extrabold">
        <span className="grid size-7 place-items-center rounded-lg bg-brand text-sm text-white">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, ltr, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; ltr?: boolean; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className={`field ${ltr ? "text-right" : ""}`} dir={ltr ? "ltr" : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled, danger }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`grid size-8 place-items-center rounded-lg text-stone-500 transition hover:bg-white disabled:opacity-30 ${danger ? "hover:text-rose-600" : "hover:text-ink"}`}>
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-brand" : "bg-stone-300"}`}>
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? "right-6" : "right-1"}`} />
    </button>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-600">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
