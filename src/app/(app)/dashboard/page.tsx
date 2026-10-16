import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { money } from "@/lib/quote";

type Row = { status: string; total: number; created_by: string | null; issue_date: string; sent_at: string | null; approved_at: string | null };

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const ymOf = (d: string) => d.slice(0, 7);
const shift = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const label = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function summarize(rows: Row[]) {
  const out = rows.filter((r) => r.status !== "draft");
  const approved = rows.filter((r) => r.status === "approved");
  const decided = rows.filter((r) => r.status === "approved" || r.status === "rejected").length;
  const offered = out.reduce((s, r) => s + Number(r.total), 0);
  const won = approved.reduce((s, r) => s + Number(r.total), 0);
  const waits = approved
    .filter((r) => r.sent_at && r.approved_at)
    .map((r) => (Date.parse(r.approved_at!) - Date.parse(r.sent_at!)) / 3600000)
    .filter((h) => h >= 0);
  return {
    created: rows.length,
    out: out.length,
    approved: approved.length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    open: rows.filter((r) => r.status === "sent").length,
    decided,
    offered,
    won,
    rate: pct(approved.length, out.length),
    avgHours: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
  };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { supabase, profile, business } = await requireBusiness();
  if (profile.business_role !== "manager" && !profile.is_super_admin) redirect("/quotes");
  const sp = await searchParams;
  const now = new Date().toISOString().slice(0, 7);
  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? "") && sp.m! <= now ? sp.m! : now;
  const from = shift(ym, -5);

  const { data } = await supabase
    .from("quotes")
    .select("status,total,created_by,issue_date,sent_at,approved_at")
    .eq("business_id", business.id)
    .gte("issue_date", `${from}-01`)
    .lt("issue_date", `${shift(ym, 1)}-01`)
    .limit(5000)
    .returns<Row[]>();
  const rows = data ?? [];
  const month = rows.filter((r) => ymOf(r.issue_date) === ym);
  const prev = rows.filter((r) => ymOf(r.issue_date) === shift(ym, -1));
  const m = summarize(month);
  const p = summarize(prev);

  const { data: members } = await supabase.from("profiles").select("id,full_name,job_title").eq("business_id", business.id);
  const team = (members ?? [])
    .map((u) => ({ ...u, s: summarize(month.filter((r) => r.created_by === u.id)) }))
    .filter((u) => u.s.created > 0)
    .sort((a, b) => b.s.won - a.s.won);

  const trend = Array.from({ length: 6 }, (_, i) => {
    const k = shift(ym, i - 5);
    const s = summarize(rows.filter((r) => ymOf(r.issue_date) === k));
    return { k, ...s };
  });
  const maxWon = Math.max(1, ...trend.map((t) => t.offered));

  const delta = (a: number, b: number) => {
    if (!b) return null;
    const d = Math.round(((a - b) / b) * 100);
    return <span className={`text-xs font-bold ${d >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{d >= 0 ? "▲" : "▼"} {Math.abs(d)}% מהחודש הקודם</span>;
  };

  return (
    <>
      <PageHeader
        title="דשבורד חודשי"
        subtitle="כמה הצעות יצאו, כמה אושרו ומי סוגר הכי הרבה"
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-stone-200">
            <Link href={`/dashboard?m=${shift(ym, -1)}`} className="rounded-lg p-2 hover:bg-stone-100" aria-label="חודש קודם">
              <ChevronRight className="size-4" />
            </Link>
            <span className="min-w-28 text-center font-bold">{label(ym)}</span>
            {ym < now ? (
              <Link href={`/dashboard?m=${shift(ym, 1)}`} className="rounded-lg p-2 hover:bg-stone-100" aria-label="חודש הבא">
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span className="p-2 opacity-25">
                <ChevronLeft className="size-4" />
              </span>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="הצעות שיצאו" value={String(m.out)} sub={delta(m.out, p.out)} />
        <Kpi label="אושרו" value={String(m.approved)} sub={<span className="text-xs text-stone-500">{m.open} ממתינות · {m.rejected} נדחו</span>} />
        <Kpi label="סכום שאושר" value={money(m.won)} sub={delta(m.won, p.won)} />
        <Kpi
          label="אחוז הצלחה"
          value={`${m.rate}%`}
          sub={
            <span className="text-xs text-stone-500">
              {m.avgHours != null ? `זמן ממוצע לאישור: ${m.avgHours < 48 ? `${Math.round(m.avgHours)} שעות` : `${Math.round(m.avgHours / 24)} ימים`}` : "מתוך ההצעות שיצאו"}
            </span>
          }
        />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-4 text-[17px] font-extrabold">חצי שנה אחרונה</h2>
        <div className="flex h-48 items-end gap-3">
          {trend.map((t) => (
            <Link key={t.k} href={`/dashboard?m=${t.k}`} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1 text-center">
              <span className="text-[11px] font-bold tabular-nums text-stone-600">{t.won ? money(t.won).replace(/\.00$/, "") : ""}</span>
              <div className="relative w-full overflow-hidden rounded-t-lg bg-stone-200/70" style={{ height: `${Math.max(3, (t.offered / maxWon) * 100)}%` }}>
                <div className="absolute inset-x-0 bottom-0 bg-brand transition group-hover:brightness-110" style={{ height: `${t.offered ? (t.won / t.offered) * 100 : 0}%` }} />
              </div>
              <span className={`truncate text-xs ${t.k === ym ? "font-extrabold text-ink" : "text-stone-500"}`}>{MONTHS[Number(t.k.slice(5, 7)) - 1]}</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-3 rounded-sm bg-brand" /> אושר
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-3 rounded-sm bg-stone-200" /> סה״כ שהוצע
          </span>
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="mb-4 text-[17px] font-extrabold">הצוות ב{label(ym)}</h2>
        {team.length === 0 ? (
          <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">אין הצעות בחודש הזה.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-right text-xs text-stone-500">
                  <th className="pb-2 font-semibold">איש צוות</th>
                  <th className="pb-2 font-semibold">יצאו</th>
                  <th className="pb-2 font-semibold">אושרו</th>
                  <th className="pb-2 font-semibold">סכום שאושר</th>
                  <th className="pb-2 font-semibold">אחוז הצלחה</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {team.map((u) => (
                  <tr key={u.id} className="border-b border-stone-100">
                    <td className="py-2.5">
                      <div className="font-bold">{u.full_name || "—"}</div>
                      {u.job_title ? <div className="text-xs text-stone-500">{u.job_title}</div> : null}
                    </td>
                    <td>{u.s.out}</td>
                    <td>{u.s.approved}</td>
                    <td className="font-bold">{money(u.s.won)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-stone-200">
                          <div className="h-full bg-brand" style={{ width: `${u.s.rate}%` }} />
                        </div>
                        {u.s.rate}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-[12.5px] font-semibold text-stone-500">{label}</div>
      <div className="mt-1 break-words text-xl font-extrabold leading-tight tabular-nums sm:text-2xl">{value}</div>
      <div className="mt-1 min-h-4">{sub}</div>
    </div>
  );
}
