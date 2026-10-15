import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import QuoteEditor from "@/components/QuoteEditor";
import { loadPriceHistory, toDocAuthor, toDocBusiness } from "@/lib/doc-data";
import { draftFromRequest } from "@/lib/request-draft";
import type { Client, QuoteRequest } from "@/lib/types";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ client?: string; request?: string }> }) {
  const { supabase, profile, business } = await requireBusiness();
  const sp = await searchParams;
  const { data: clients } = await supabase.from("clients").select("*").eq("business_id", business.id).order("name").returns<Client[]>();
  const history = await loadPriceHistory(supabase, business.id);

  let initial: unknown = null;
  let priceSources: Record<string, string> = {};
  let fromRequest: QuoteRequest | null = null;
  if (sp.request) {
    const { data: r } = await supabase.from("quote_requests").select("*").eq("id", sp.request).maybeSingle<QuoteRequest>();
    if (r) {
      fromRequest = r;
      const d = draftFromRequest(r, clients ?? [], history, business.quote_prefix ?? "");
      initial = d.initial;
      priceSources = d.priceSources;
    }
  } else if (sp.client) {
    const pre = (clients ?? []).find((c) => c.id === sp.client);
    if (pre)
      initial = {
        client_id: pre.id,
        client_name: pre.name,
        client_contact: pre.contact_name,
        client_phone: pre.phone,
        client_email: pre.email,
        client_address: pre.address,
        client_tax_id: pre.tax_id,
      };
  }
  return (
    <>
      <PageHeader
        title={fromRequest ? `הצעה לבקשה של ${fromRequest.client_name}` : "הצעת מחיר חדשה"}
        subtitle={fromRequest ? "הפרטים מולאו מהבקשה — נשאר להשלים מחירים ולשמור" : "ממלאים מימין — רואים את המסמך מתעדכן בזמן אמת"}
      />
      {fromRequest?.request_text || fromRequest?.notes ? (
        <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <div className="text-xs font-bold text-sky-800">מה הלקוח כתב (לא מופיע בהצעה)</div>
          <div className="mt-1 whitespace-pre-wrap">{[fromRequest.request_text, fromRequest.notes].filter(Boolean).join("\n\n")}</div>
        </div>
      ) : null}
      <QuoteEditor
        business={toDocBusiness(business)}
        author={toDocAuthor(profile)}
        clients={clients ?? []}
        initial={initial as never}
        history={history}
        priceSources={priceSources}
      />
    </>
  );
}
