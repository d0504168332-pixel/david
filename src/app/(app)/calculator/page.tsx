import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { withDefaults } from "@/lib/pricing";
import CalculatorForm from "./CalculatorForm";

export const metadata = { title: "מחשבון עלויות – סגרנו" };

export default async function CalculatorPage() {
  const { profile, business } = await requireBusiness();
  if (business.business_type !== "transport") redirect("/automation");
  const canEdit = profile.business_role === "manager" || profile.is_super_admin;
  return (
    <>
      <PageHeader
        title="מחשבון עלויות"
        subtitle="מגדירים פעם אחת את העלויות של החברה — וכל הצעה מחושבת לפיהן. משהו השתנה (למשל מחיר הסולר)? מעדכנים כאן וזה רץ אוטומטית."
      />
      <CalculatorForm initial={withDefaults(business.pricing)} canEdit={canEdit} />
    </>
  );
}
