import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { getSession } from "@/lib/auth";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const s = await getSession();
  if (!s) redirect("/forgot?e=expired");
  return (
    <AuthShell title="סיסמה חדשה" subtitle={`עבור ${s.user.email ?? ""}`}>
      <ResetForm />
    </AuthShell>
  );
}
