import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import ClientsManager from "./ClientsManager";
import type { Client } from "@/lib/types";

export default async function ClientsPage() {
  const { supabase, business } = await requireBusiness();
  const { data: clients } = await supabase.from("clients").select("*").eq("business_id", business.id).order("name").returns<Client[]>();
  const { data: counts } = await supabase.from("quotes").select("client_id").eq("business_id", business.id).not("client_id", "is", null);
  const qc: Record<string, number> = {};
  (counts ?? []).forEach((r) => {
    if (r.client_id) qc[r.client_id] = (qc[r.client_id] ?? 0) + 1;
  });
  return (
    <>
      <PageHeader title="לקוחות" subtitle="לקוחות שמורים — בחירה מהירה בהצעה חדשה" />
      <ClientsManager clients={clients ?? []} quoteCounts={qc} />
    </>
  );
}
