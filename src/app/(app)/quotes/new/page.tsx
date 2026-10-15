import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import QuoteEditor from "@/components/QuoteEditor";
import { toDocAuthor, toDocBusiness } from "@/lib/doc-data";
import type { Client } from "@/lib/types";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { supabase, profile, business } = await requireBusiness();
  const sp = await searchParams;
  const { data: clients } = await supabase.from("clients").select("*").eq("business_id", business.id).order("name").returns<Client[]>();
  const pre = sp.client ? (clients ?? []).find((c) => c.id === sp.client) : null;
  const initial = pre
    ? ({
        client_id: pre.id,
        client_name: pre.name,
        client_contact: pre.contact_name,
        client_phone: pre.phone,
        client_email: pre.email,
        client_address: pre.address,
        client_tax_id: pre.tax_id,
      } as never)
    : null;
  return (
    <>
      <PageHeader title="הצעת מחיר חדשה" subtitle="ממלאים משמאל — רואים את המסמך מתעדכן בזמן אמת" />
      <QuoteEditor business={toDocBusiness(business)} author={toDocAuthor(profile)} clients={clients ?? []} initial={initial} />
    </>
  );
}
