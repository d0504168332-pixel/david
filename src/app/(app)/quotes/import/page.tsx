import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { editorExtras, loadPriceHistory, toDocAuthor, toDocBusiness } from "@/lib/doc-data";
import type { Client } from "@/lib/types";
import ImportFlow from "./ImportFlow";

export default async function ImportPage() {
  const { supabase, profile, business } = await requireBusiness();
  const { data: clients } = await supabase.from("clients").select("*").eq("business_id", business.id).order("name").returns<Client[]>();
  const history = await loadPriceHistory(supabase, business.id);
  const extras = await editorExtras(supabase, business, profile);
  return (
    <>
      <PageHeader title="ממייל להצעת מחיר" subtitle="מדביקים מייל או הודעה של לקוח — כל בקשה הופכת לשורה מסודרת, נשאר רק להכניס מחיר" />
      <ImportFlow
        business={toDocBusiness(business)}
        author={toDocAuthor(profile)}
        clients={clients ?? []}
        history={history}
        {...extras}
        aiEnabled={!!process.env.ANTHROPIC_API_KEY}
      />
    </>
  );
}
