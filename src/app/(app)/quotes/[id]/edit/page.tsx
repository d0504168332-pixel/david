import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import QuoteEditor from "@/components/QuoteEditor";
import { AUTHOR_COLS, toDocAuthor, toDocBusiness } from "@/lib/doc-data";
import { quoteNumber } from "@/lib/quote";
import type { Client, Profile, Quote } from "@/lib/types";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, business } = await requireBusiness();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle<Quote>();
  if (!quote) notFound();
  const { data: clients } = await supabase.from("clients").select("*").eq("business_id", business.id).order("name").returns<Client[]>();
  let author: Partial<Profile> | null = profile;
  if (quote.created_by && quote.created_by !== profile.id) {
    const { data } = await supabase.from("profiles").select(AUTHOR_COLS).eq("id", quote.created_by).maybeSingle();
    author = (data as Partial<Profile>) ?? profile;
  }
  return (
    <>
      <PageHeader title={`עריכת הצעה ${quoteNumber(business.quote_prefix, quote.number)}`} />
      <QuoteEditor
        business={toDocBusiness(business)}
        author={toDocAuthor(author)}
        clients={clients ?? []}
        initial={{ ...quote, items: (quote.items as Quote["items"]) ?? [], save_client: false } as Quote}
      />
    </>
  );
}
