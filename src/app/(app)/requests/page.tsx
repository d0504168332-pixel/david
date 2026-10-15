import Link from "next/link";
import { headers } from "next/headers";
import { Inbox } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import RequestCard from "./RequestCard";
import ShareRequestLink from "./ShareRequestLink";
import { inboxAddress } from "@/lib/inbox";
import type { QuoteRequest } from "@/lib/types";

type SP = Promise<{ status?: string }>;

export default async function RequestsPage({ searchParams }: { searchParams: SP }) {
  const { supabase, business } = await requireBusiness();
  const sp = await searchParams;
  const status = ["new", "quoted", "closed"].includes(sp.status ?? "") ? sp.status! : "new";
  const { data: all } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<QuoteRequest[]>();
  const list = (all ?? []).filter((r) => r.status === status);
  const counts = { new: 0, quoted: 0, closed: 0 } as Record<string, number>;
  (all ?? []).forEach((r) => (counts[r.status] = (counts[r.status] ?? 0) + 1));

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const link = `${origin}/r/${business.request_token}`;

  const tabs: [string, string][] = [["new", "חדשות"], ["quoted", "נשלחה הצעה"], ["closed", "סגורות"]];
  return (
    <>
      <PageHeader title="בקשות מלקוחות" subtitle="בקשות מהטופס ומהמייל מגיעות לכאן — ומכאן הופכות להצעה בלחיצה" />
      <ShareRequestLink link={link} businessName={business.name} email={inboxAddress(business.inbox_code)} />
      <div className="mb-4 mt-6 flex flex-wrap gap-2">
        {tabs.map(([k, label]) => (
          <Link
            key={k}
            href={`/requests?status=${k}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${status === k ? "bg-ink text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"}`}
          >
            {label} {counts[k] ? <span className="opacity-70">({counts[k]})</span> : null}
          </Link>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card grid place-items-center px-6 py-14 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Inbox className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold">{status === "new" ? "אין בקשות חדשות" : "אין כאן בקשות"}</h3>
          <p className="mt-1 max-w-sm text-stone-500">שלחו ללקוחות את הקישור לטופס, או שימו אותו באתר ובחתימת המייל.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((r) => (
            <RequestCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </>
  );
}
