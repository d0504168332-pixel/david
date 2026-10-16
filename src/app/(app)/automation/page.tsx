import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { withDefaults } from "@/lib/pricing";
import type { QuoteTemplate } from "@/lib/types";
import AutomationForm from "./AutomationForm";
import { mailConfigured } from "@/lib/mailer";
import TemplatesList from "./TemplatesList";

export default async function AutomationPage() {
  const { supabase, profile, business } = await requireBusiness();
  if (profile.business_role !== "manager" && !profile.is_super_admin) redirect("/quotes");
  const transport = business.business_type === "transport";
  const { data: templates } = await supabase.from("quote_templates").select("*").eq("business_id", business.id).order("name").returns<QuoteTemplate[]>();
  return (
    <>
      <PageHeader
        title={transport ? "מחירון ואוטומציות" : "אוטומציות ותבניות"}
        subtitle={transport ? "מגדירים פעם אחת, והמערכת מחשבת מחירים, מזכירה ללקוחות ומעדכנת אותך" : "תזכורות ללקוחות, התראות ותבניות הצעה"}
      />
      <AutomationForm
        transport={transport}
        initial={{
          pricing: transport ? withDefaults(business.pricing) : null,
          reminder_days: business.reminder_days ?? 3,
          reminder_max: business.reminder_max ?? 2,
          notify_on_view: business.notify_on_view ?? true,
          notify_on_approve: business.notify_on_approve ?? true,
        }}
        mailReady={mailConfigured()}
        mapsGoogle={!!process.env.GOOGLE_MAPS_API_KEY}
      />
      <TemplatesList templates={(templates ?? []).map((t) => ({ id: t.id, name: t.name, title: t.title, count: (t.items ?? []).length }))} />
    </>
  );
}
