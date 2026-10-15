import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import PageHeader from "@/components/PageHeader";
import BusinessForm from "@/components/BusinessForm";
import { updateBusinessAdmin } from "@/app/actions/admin";
import MembersPanel from "./MembersPanel";
import BusinessDanger from "./BusinessDanger";
import type { Business, Profile } from "@/lib/types";

export default async function AdminBusinessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireSuperAdmin();
  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("*").eq("id", id).maybeSingle<Business>();
  if (!business) notFound();
  const { data: members } = await admin.from("profiles").select("*").eq("business_id", id).order("created_at").returns<Profile[]>();

  return (
    <>
      <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-ink">
        <ChevronRight className="size-4" /> ניהול מערכת
      </Link>
      <PageHeader title={business.name} subtitle={business.is_active ? "עסק פעיל" : "העסק מושבת — המשתמשים שלו לא יכולים להיכנס"} />
      {sp.created ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">
          העסק נוצר בהצלחה. עכשיו הוסף את המשתמשים שלו ↓
        </div>
      ) : null}

      <MembersPanel businessId={business.id} members={members ?? []} selfId={profile.id} />

      <h2 className="mb-4 mt-10 text-xl font-extrabold">פרטי העסק ועיצוב</h2>
      <BusinessForm action={updateBusinessAdmin} business={business} hidden={{ business_id: business.id }} />

      <BusinessDanger businessId={business.id} active={business.is_active} isMine={profile.business_id === business.id} />
    </>
  );
}
