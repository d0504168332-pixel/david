import Link from "next/link";
import { Plus, Building2, Users, FileText, ChevronLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import PageHeader from "@/components/PageHeader";
import type { Business } from "@/lib/types";
import LeadsList, { type Lead } from "./LeadsList";
import MailboxConnect from "@/components/MailboxConnect";

export default async function AdminPage() {
  const { profile } = await requireSuperAdmin();
  const admin = createAdminClient();
  const [{ data: businesses }, { data: members }, { data: quotes }, { data: leads }, { data: myMail }] = await Promise.all([
    admin.from("businesses").select("*").order("created_at", { ascending: false }).returns<Business[]>(),
    admin.from("profiles").select("id,business_id"),
    admin.from("quotes").select("business_id"),
    admin.from("signup_leads").select("*").order("created_at", { ascending: false }).limit(100).returns<Lead[]>(),
    admin.from("mail_accounts").select("email,verified_at,last_error").eq("profile_id", profile.id).maybeSingle(),
  ]);
  const mc: Record<string, number> = {};
  (members ?? []).forEach((m) => m.business_id && (mc[m.business_id] = (mc[m.business_id] ?? 0) + 1));
  const qc: Record<string, number> = {};
  (quotes ?? []).forEach((q) => (qc[q.business_id] = (qc[q.business_id] ?? 0) + 1));

  return (
    <>
      <PageHeader
        title="ניהול מערכת"
        subtitle="פתיחת עסקים, הגדרת הפרטים שלהם וניהול המשתמשים בכל עסק"
        actions={
          <Link href="/admin/new" className="btn-primary">
            <Plus className="size-4" /> עסק חדש
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat icon={<Building2 className="size-5" />} label="עסקים" value={businesses?.length ?? 0} />
        <Stat icon={<Users className="size-5" />} label="משתמשים" value={(members ?? []).filter((m) => m.business_id).length} />
        <Stat icon={<FileText className="size-5" />} label="הצעות במערכת" value={quotes?.length ?? 0} />
      </div>

      <LeadsList leads={leads ?? []} />
      <div className="mb-6">
        <MailboxConnect
          scope="me"
          status={myMail ? { email: myMail.email, verified: !!myMail.verified_at, error: myMail.last_error } : null}
          defaultEmail={profile.email}
          title="המייל שלי לקבלת בקשות מנוי"
          subtitle="כשמישהו משאיר פרטים, תקבל עליו מייל. החיבור כאן משמש רק לשליחת ההתראה אליך — הבקשות נשמרות כאן גם בלי חיבור."
        />
      </div>

      {(businesses ?? []).length === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Building2 className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold">עוד אין עסקים במערכת</h3>
          <p className="mt-1 max-w-sm text-stone-500">פתח עסק ראשון, הגדר לו לוגו ופרטים, והוסף לו משתמשים — כל אחד עם חתימה וחותמת משלו.</p>
          <Link href="/admin/new" className="btn-primary mt-5">
            <Plus className="size-4" /> פתיחת עסק ראשון
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(businesses ?? []).map((b) => (
            <Link key={b.id} href={`/admin/${b.id}`} className="card group p-4 transition hover:-translate-y-px hover:shadow-md">
              <div className="flex items-center gap-3">
                {b.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logo_url} alt="" className="size-12 rounded-xl border border-stone-200 object-contain p-1" />
                ) : (
                  <div className="grid size-12 place-items-center rounded-xl text-lg font-black text-white" style={{ background: b.primary_color }}>
                    {b.name[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold">{b.name}</div>
                  <div className="text-sm text-stone-500">
                    {mc[b.id] ?? 0} משתמשים · {qc[b.id] ?? 0} הצעות
                  </div>
                </div>
                <ChevronLeft className="size-5 text-stone-300 transition group-hover:text-ink" />
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">{b.business_type === "transport" ? "חברת הסעות" : "עסק כללי"}</span>
                {!b.is_active ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">מושבת</span> : null}
                {profile.business_id === b.id ? <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">העסק שלך</span> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="hidden size-10 place-items-center rounded-xl bg-brand/10 text-brand sm:grid">{icon}</div>
      <div>
        <div className="text-[12.5px] font-semibold text-stone-500">{label}</div>
        <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
