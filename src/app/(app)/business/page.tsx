import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import BusinessForm from "@/components/BusinessForm";
import { updateMyBusiness } from "@/app/actions/settings";
import { toDocAuthor } from "@/lib/doc-data";

export default async function BusinessPage() {
  const { profile, business } = await requireBusiness();
  if (profile.business_role !== "manager" && !profile.is_super_admin) redirect("/quotes");
  return (
    <>
      <PageHeader
        title="פרטי העסק ועיצוב"
        subtitle="הלוגו, הפרטים והעיצוב יופיעו על כל הצעות המחיר של העסק"
        actions={
          <Link href="/automation" className="btn-ghost">
            <Zap className="size-4" /> {business.business_type === "transport" ? "מחירון ואוטומציות" : "אוטומציות ותבניות"}
          </Link>
        }
      />
      <BusinessForm action={updateMyBusiness} business={business} previewAuthor={toDocAuthor(profile)} />
    </>
  );
}
