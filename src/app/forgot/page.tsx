import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import ForgotForm from "./ForgotForm";

export const metadata = { title: "שכחתי סיסמה – סגרנו" };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <AuthShell title="שכחתי סיסמה" subtitle="נשלח לך למייל קישור לבחירת סיסמה חדשה.">
      {e === "expired" ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">הקישור פג תוקף או כבר נוצל. בקשו קישור חדש.</div>
      ) : null}
      <ForgotForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-bold text-[#16263F] underline">חזרה לכניסה</Link>
      </p>
    </AuthShell>
  );
}
