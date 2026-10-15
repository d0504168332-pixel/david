import { requireSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import ProfileEditor from "./ProfileEditor";
import PasswordForm from "./PasswordForm";

export default async function ProfilePage() {
  const { profile, business } = await requireSession();
  return (
    <>
      <PageHeader title="חתימה, חותמת ופרופיל" subtitle="הפרטים, החתימה והחותמת שלך יופיעו על כל הצעה שתפיק" />
      <ProfileEditor
        profile={profile}
        businessName={business?.name ?? "שם העסק"}
        taxId={business?.show_tax_id ? business.tax_id : null}
      />
      <div className="mt-6">
        <PasswordForm email={profile.email} />
      </div>
    </>
  );
}
