import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import SetupForm from "./SetupForm";
import { superAdminExists } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await superAdminExists()) redirect("/login");
  return (
    <AuthShell title="הגדרה ראשונית" subtitle="יצירת חשבון מנהל המערכת — פעם אחת בלבד">
      <SetupForm />
    </AuthShell>
  );
}
