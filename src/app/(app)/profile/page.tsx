import { requireSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import ProfileEditor from "./ProfileEditor";
import PasswordForm from "./PasswordForm";
import MailboxConnect from "@/components/MailboxConnect";
import { mailStatus } from "@/lib/mail-accounts";

export default async function ProfilePage() {
  const { profile, business } = await requireSession();
  const mail = business ? await mailStatus(business.id, profile.id) : null;
  return (
    <>
      <PageHeader title="חתימה, חותמת ופרופיל" subtitle="הפרטים, החתימה והחותמת שלך יופיעו על כל הצעה שתפיק" />
      <ProfileEditor
        profile={profile}
        businessName={business?.name ?? "שם העסק"}
        taxId={business?.show_tax_id ? business.tax_id : null}
      />
      {business && mail ? (
        <div className="mt-6">
          <MailboxConnect
            scope="me"
            status={mail.mine}
            defaultEmail={profile.email}
            title="המייל שלי לשליחת הצעות"
            subtitle={
              mail.business
                ? `ההצעות שתשלח יצאו מהמייל שלך. כל עוד לא חיברת — הן יוצאות ממייל העסק (${mail.business.email}).`
                : "ההצעות, התזכורות וההתראות שלך יישלחו ללקוחות מהמייל הזה, בשמך."
            }
          />
        </div>
      ) : null}
      <div className="mt-6">
        <PasswordForm email={profile.email} />
      </div>
    </>
  );
}
