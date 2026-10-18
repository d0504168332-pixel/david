import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import QuoteDocument from "@/components/doc/QuoteDocument";
import DocPreview from "@/components/doc/DocPreview";
import QuoteActions from "@/components/QuoteActions";
import { AUTHOR_COLS, toDocAuthor, toDocBusiness } from "@/lib/doc-data";
import { STATUS_CLASS, STATUS_LABEL, calcTotals, formatDate, quoteNumber } from "@/lib/quote";
import type { Profile, Quote } from "@/lib/types";
import { tripCsv } from "@/lib/trip-export";
import { toWin1255, yitMissing, yitText } from "@/lib/yit-export";
import { mailStatus } from "@/lib/mail-accounts";

export default async function QuoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business, profile } = await requireBusiness();
  const mail = await mailStatus(business.id, profile.id);
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle<Quote>();
  if (!quote) notFound();
  let author: Partial<Profile> | null = null;
  if (quote.created_by) {
    const { data } = await supabase.from("profiles").select(AUTHOR_COLS).eq("id", quote.created_by).maybeSingle();
    author = data as Partial<Profile> | null;
  }
  const num = quoteNumber(business.quote_prefix, quote.number);
  // סטטוס שליחה אחרי אישור: Webhook ומייל לסדרן
  const channels: { key: string; label: string }[] = [
    ...(business.business_type === "transport" && business.ops_emails ? [{ key: "email.trip", label: `מייל נסיעה ל-${business.ops_emails}` }] : []),
    ...(business.business_type === "transport" && business.webhook_url ? [{ key: "quote.approved", label: "מערכת חיצונית (Webhook)" }] : []),
  ];
  const sync: { label: string; ok?: boolean; at?: string; code?: number | null }[] = [];
  for (const ch of channels) {
    const { data: d } = await supabase
      .from("webhook_deliveries")
      .select("ok,created_at,status_code")
      .eq("quote_id", quote.id)
      .eq("event", ch.key)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sync.push({ label: ch.label, ok: d?.ok, at: d?.created_at, code: d?.status_code });
  }
  const isTrip = business.business_type === "transport" && !!quote.meta?.trip;
  const csv = isTrip ? tripCsv(quote, business) : null;
  const yitMiss = isTrip ? yitMissing(quote) : [];
  const yitB64 = isTrip ? Buffer.from(toWin1255(yitText(quote))).toString("base64") : null;
  const totals = calcTotals(quote);

  return (
    <>
      <div className="no-print mb-6">
        <Link href="/quotes" className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-ink">
          <ChevronRight className="size-4" /> כל ההצעות
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-extrabold tracking-tight">{quote.client_name}</h1>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_CLASS[quote.status]}`}>{STATUS_LABEL[quote.status]}</span>
        </div>
        <p className="mt-1 text-stone-500">
          {num} · {formatDate(quote.issue_date)}
          {author?.full_name ? ` · הופקה ע״י ${author.full_name}` : ""}
          {quote.approved_by_name ? ` · אושרה ע״י ${quote.approved_by_name}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
          {quote.view_count ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800 ring-1 ring-sky-200">
              👀 הלקוח פתח {quote.view_count === 1 ? "פעם אחת" : `${quote.view_count} פעמים`} · לאחרונה {new Date(quote.last_viewed_at ?? quote.viewed_at!).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}
            </span>
          ) : quote.status === "sent" ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600 ring-1 ring-stone-200">הלקוח עוד לא פתח את ההצעה</span>
          ) : null}
          {quote.reminder_count ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 ring-1 ring-amber-200">
              נשלחו {quote.reminder_count} תזכורות · אחרונה {formatDate(quote.reminded_at)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] print:block">
        <div className="print-area rounded-2xl bg-stone-200/50 p-3 sm:p-6 print:bg-transparent print:p-0">
          <DocPreview>
            <QuoteDocument id="quote-doc" business={toDocBusiness(business)} author={toDocAuthor(author)} quote={quote} />
          </DocPreview>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <QuoteActions
            id={quote.id}
            token={quote.share_token}
            status={quote.status}
            number={num}
            businessName={business.name}
            authorName={author?.full_name ?? business.name}
            clientName={quote.client_name}
            clientPhone={quote.client_phone}
            clientEmail={quote.client_email}
            total={totals.total}
            docId="quote-doc"
            sync={sync}
            tripCsv={csv}
            yitB64={yitB64}
            yitMissing={yitMiss}
            canRemind={quote.status === "sent"}
            mailReady={mail.ready}
          />
        </div>
      </div>
    </>
  );
}
