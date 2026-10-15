import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import BusinessForm from "@/components/BusinessForm";
import { createBusiness } from "@/app/actions/admin";

export default async function NewBusinessPage() {
  await requireSuperAdmin();
  return (
    <>
      <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-ink">
        <ChevronRight className="size-4" /> ניהול מערכת
      </Link>
      <PageHeader title="פתיחת עסק חדש" subtitle="אחרי השמירה תוכל להוסיף משתמשים לעסק" />
      <BusinessForm action={createBusiness} submitLabel="יצירת העסק" />
    </>
  );
}
