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

export default async function QuoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, business } = await requireBusiness();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle<Quote>();
  if (!quote) notFound();
  let author: Partial<Profile> | null = null;
  if (quote.created_by) {
    const { data } = await supabase.from("profiles").select(AUTHOR_COLS).eq("id", quote.created_by).maybeSingle();
    author = data as Partial<Profile> | null;
  }
  const num = quoteNumber(business.quote_prefix, quote.number);
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
          />
        </div>
      </div>
    </>
  );
}
