import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FilePlus2, Phone, Mail, MapPin } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { STATUS_CLASS, STATUS_LABEL, formatDate, money, quoteNumber } from "@/lib/quote";
import type { Client, Quote } from "@/lib/types";
import ClientLink from "./ClientLink";

export default async function ClientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireBusiness();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>();
  if (!client) notFound();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,number,title,issue_date,status,total,created_by")
    .eq("business_id", business.id)
    .or(`client_id.eq.${client.id},client_name.eq."${client.name.replace(/"/g, "")}"`)
    .order("issue_date", { ascending: false })
    .returns<Quote[]>();
  const { data: members } = await supabase.from("profiles").select("id,full_name").eq("business_id", business.id);
  const nameOf = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const list = quotes ?? [];
  const approved = list.filter((q) => q.status === "approved");
  const decided = list.filter((q) => q.status === "approved" || q.status === "rejected").length;

  return (
    <>
      <Link href="/clients" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-ink">
        <ChevronRight className="size-4" /> לקוחות
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight">{client.name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
            {client.contact_name ? <span>{client.contact_name}</span> : null}
            {client.phone ? <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{client.phone}</span> : null}
            {client.email ? <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{client.email}</span> : null}
            {client.address ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{client.address}</span> : null}
          </div>
        </div>
        <Link href={`/quotes/new?client=${client.id}`} className="btn-primary">
          <FilePlus2 className="size-4" /> הצעה חדשה ללקוח
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="הצעות" value={String(list.length)} />
        <Stat label="סה״כ הוצע" value={money(list.reduce((s, q) => s + Number(q.total), 0))} />
        <Stat label="סה״כ אושר" value={money(approved.reduce((s, q) => s + Number(q.total), 0))} />
        <Stat label="אחוז אישור" value={decided ? `${Math.round((approved.length / decided) * 100)}%` : "—"} />
      </div>

      {business.business_type === "transport" && client.portal_token ? (
        <ClientLink path={`/r/${business.request_token}?c=${client.portal_token}`} name={client.contact_name || client.name} phone={client.phone} businessName={business.name} />
      ) : null}

      {client.notes ? <div className="card mb-5 whitespace-pre-wrap p-4 text-sm text-stone-600">{client.notes}</div> : null}

      <div className="card overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-3 font-extrabold">היסטוריית הצעות</div>
        {list.length === 0 ? (
          <p className="p-8 text-center text-stone-500">עוד לא הופקו הצעות ללקוח הזה.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {list.map((q) => (
              <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-stone-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{quoteNumber(business.quote_prefix, q.number)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ring-1 ${STATUS_CLASS[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                  </div>
                  <div className="truncate text-sm text-stone-500">
                    {formatDate(q.issue_date)}
                    {q.title ? ` · ${q.title}` : ""}
                    {q.created_by && nameOf.get(q.created_by) ? ` · ${nameOf.get(q.created_by)}` : ""}
                  </div>
                </div>
                <div className="font-extrabold tabular-nums">{money(q.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[12.5px] font-semibold text-stone-500">{label}</div>
      <div className="mt-1 text-base font-extrabold leading-tight tabular-nums break-words sm:text-xl">{value}</div>
    </div>
  );
}
