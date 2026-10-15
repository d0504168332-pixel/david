import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import QuoteDocument from "@/components/doc/QuoteDocument";
import DocPreview from "@/components/doc/DocPreview";
import { AUTHOR_COLS, toDocAuthor, toDocBusiness } from "@/lib/doc-data";
import { calcTotals, formatDate, money, quoteNumber } from "@/lib/quote";
import type { Business, Profile, Quote } from "@/lib/types";
import PublicActions from "./PublicActions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(token: string) {
  if (!UUID.test(token)) return null;
  const admin = createAdminClient();
  const { data: quote } = await admin.from("quotes").select("*").eq("share_token", token).maybeSingle<Quote>();
  if (!quote) return null;
  const { data: business } = await admin.from("businesses").select("*").eq("id", quote.business_id).maybeSingle<Business>();
  if (!business || !business.is_active) return null;
  let author: Partial<Profile> | null = null;
  if (quote.created_by) {
    const { data } = await admin.from("profiles").select(AUTHOR_COLS).eq("id", quote.created_by).maybeSingle();
    author = data as Partial<Profile> | null;
  }
  return { quote, business, author };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const d = await load(token);
  if (!d) return { title: "הצעת מחיר" };
  return {
    title: `הצעת מחיר ${quoteNumber(d.business.quote_prefix, d.quote.number)} – ${d.business.name}`,
    description: `הצעת מחיר עבור ${d.quote.client_name}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuote({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await load(token);
  if (!d) notFound();
  const { quote, business, author } = d;
  const num = quoteNumber(business.quote_prefix, quote.number);
  const totals = calcTotals(quote);
  const expired = quote.valid_until && quote.valid_until < new Date().toISOString().slice(0, 10);

  return (
    <div style={{ ["--brand" as string]: business.primary_color }} className="min-h-screen bg-stone-100">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="" className="size-10 rounded-lg border border-stone-200 object-contain p-1" />
            ) : (
              <div className="grid size-10 place-items-center rounded-lg bg-brand font-black text-white">{business.name[0]}</div>
            )}
            <div className="min-w-0">
              <div className="truncate font-extrabold">{business.name}</div>
              <div className="text-sm text-stone-500">
                הצעת מחיר {num} · {formatDate(quote.issue_date)}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs text-stone-500">סה״כ</div>
            <div className="text-lg font-extrabold tabular-nums">{money(totals.total)}</div>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] print:block print:p-0">
        <div className="print-area">
          <DocPreview>
            <QuoteDocument id="quote-doc" business={toDocBusiness(business)} author={toDocAuthor(author)} quote={quote} />
          </DocPreview>
        </div>
        <aside className="no-print lg:sticky lg:top-6 lg:self-start">
          <PublicActions
            token={token}
            approved={quote.status === "approved"}
            approvedBy={quote.approved_by_name}
            expired={!!expired}
            fileName={`הצעת מחיר ${num} - ${business.name}.pdf`}
            contact={{ name: author?.full_name ?? business.name, phone: author?.phone ?? business.phone, email: author?.email ?? business.email }}
          />
        </aside>
      </main>
    </div>
  );
}
