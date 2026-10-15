import Link from "next/link";
import { Plus, FileText, Search } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { STATUS_CLASS, STATUS_LABEL, formatDate, money, quoteNumber } from "@/lib/quote";
import type { Quote, QuoteStatus } from "@/lib/types";

type SP = Promise<{ q?: string; status?: string; mine?: string }>;

export default async function QuotesPage({ searchParams }: { searchParams: SP }) {
  const { supabase, profile, business } = await requireBusiness();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (["draft", "sent", "approved", "rejected"].includes(sp.status ?? "") ? sp.status : "") as QuoteStatus | "";
  const mine = sp.mine === "1";

  let query = supabase
    .from("quotes")
    .select("id,number,title,client_name,issue_date,status,total,created_by,created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);
  if (mine) query = query.eq("created_by", profile.id);
  if (q) {
    const safe = q.replace(/[%,()"\\]/g, " ");
    const n = Number(q.replace(/\D/g, ""));
    query = query.or(
      `client_name.ilike."%${safe}%",title.ilike."%${safe}%"${Number.isFinite(n) && n > 0 ? `,number.eq.${n}` : ""}`
    );
  }
  const { data: quotes } = await query.returns<Quote[]>();

  const { data: members } = await supabase.from("profiles").select("id,full_name").eq("business_id", business.id);
  const nameOf = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  const { data: all } = await supabase.from("quotes").select("status,total").eq("business_id", business.id);
  const stats = {
    count: all?.length ?? 0,
    open: (all ?? []).filter((x) => x.status === "sent").length,
    approved: (all ?? []).filter((x) => x.status === "approved").reduce((s, x) => s + Number(x.total), 0),
  };

  const tab = (label: string, val: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (val) params.set("status", val);
    if (mine) params.set("mine", "1");
    const on = status === val;
    return (
      <Link
        key={label}
        href={`/quotes${params.size ? `?${params}` : ""}`}
        className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${on ? "bg-ink text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title="הצעות מחיר"
        subtitle={`שלום ${profile.full_name.split(" ")[0] || ""}`}
        actions={
          <Link href="/quotes/new" className="btn-primary">
            <Plus className="size-4" /> הצעה חדשה
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="סה״כ הצעות" value={String(stats.count)} />
        <Stat label="ממתינות לתשובה" value={String(stats.open)} />
        <Stat label="סכום שאושר" value={money(stats.approved)} />
      </div>

      <div className="card p-4 sm:p-5">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="/quotes">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input name="q" defaultValue={q} placeholder="חיפוש לפי לקוח, נושא או מספר הצעה" className="field pr-10" />
            {status ? <input type="hidden" name="status" value={status} /> : null}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-stone-600">
            <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="size-4 accent-[var(--brand)]" />
            רק ההצעות שלי
          </label>
          <button className="btn-ghost">חיפוש</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {tab("הכל", "")}
          {tab("טיוטות", "draft")}
          {tab("נשלחו", "sent")}
          {tab("אושרו", "approved")}
          {tab("נדחו", "rejected")}
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {(quotes ?? []).length === 0 ? (
          <div className="card grid place-items-center px-6 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
              <FileText className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold">{q || status || mine ? "לא נמצאו הצעות" : "עוד אין הצעות מחיר"}</h3>
            <p className="mt-1 text-stone-500">{q || status || mine ? "נסה לשנות את החיפוש או הסינון." : "בוא נפיק את ההצעה הראשונה — זה לוקח דקה."}</p>
            {!q && !status && !mine ? (
              <Link href="/quotes/new" className="btn-primary mt-5">
                <Plus className="size-4" /> הצעה ראשונה
              </Link>
            ) : null}
          </div>
        ) : (
          (quotes ?? []).map((qt) => (
            <Link
              key={qt.id}
              href={`/quotes/${qt.id}`}
              className="card group flex items-center gap-4 p-4 transition hover:-translate-y-px hover:shadow-md"
            >
              <div className="hidden size-11 shrink-0 place-items-center rounded-xl bg-brand/[0.07] text-[13px] font-extrabold text-brand sm:grid">
                {qt.number ? `#${String(qt.number).slice(-4)}` : "—"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold">{qt.client_name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold ring-1 ${STATUS_CLASS[qt.status]}`}>
                    {STATUS_LABEL[qt.status]}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-sm text-stone-500">
                  {quoteNumber(business.quote_prefix, qt.number)} · {formatDate(qt.issue_date)}
                  {qt.title ? ` · ${qt.title}` : ""}
                  {qt.created_by && nameOf.get(qt.created_by) ? ` · ${nameOf.get(qt.created_by)}` : ""}
                </div>
              </div>
              <div className="text-left">
                <div className="font-extrabold tabular-nums">{money(qt.total)}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[12.5px] font-semibold text-stone-500">{label}</div>
      <div className="mt-1 truncate text-lg font-extrabold tabular-nums sm:text-2xl">{value}</div>
    </div>
  );
}
