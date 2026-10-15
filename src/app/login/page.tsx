import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";
import { getSession } from "@/lib/auth";
import { superAdminExists } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const s = await getSession();
  if (s?.profile) redirect("/");
  let needsSetup = false;
  try {
    needsSetup = !(await superAdminExists());
  } catch {}
  return (
    <AuthShell title="ברוכים השבים" subtitle="התחבר כדי להמשיך להפקת הצעות מחיר">
      {needsSetup ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          המערכת עדיין לא הוגדרה.{" "}
          <Link href="/setup" className="font-bold underline">הגדרת מנהל המערכת ←</Link>
        </div>
      ) : null}
      <LoginForm />
    </AuthShell>
  );
}
