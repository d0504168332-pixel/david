import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import JoinForm from "./JoinForm";

export const metadata = { title: "הצטרפות לסגרנו" };

export default function JoinPage() {
  return (
    <AuthShell title="רוצים מנוי לסגרנו?" subtitle="השאירו פרטים — נחזור אליכם ונפתח לכם חשבון.">
      <JoinForm />
      <p className="mt-6 text-center text-sm text-stone-500">
        כבר יש לך משתמש?{" "}
        <Link href="/login" className="font-bold text-[#16263F] underline">
          כניסה
        </Link>
      </p>
    </AuthShell>
  );
}
