"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function PasswordForm({ email }: { email: string }) {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="card max-w-2xl p-5">
      <h2 className="text-[17px] font-extrabold">החלפת סיסמה</h2>
      <p className="mb-4 text-sm text-stone-500">כניסה עם: <span dir="ltr">{email}</span></p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">סיסמה חדשה</label>
          <input name="password" type="password" minLength={8} required dir="ltr" className="field text-right" autoComplete="new-password" />
        </div>
        <div>
          <label className="label">אימות סיסמה</label>
          <input name="confirm" type="password" minLength={8} required dir="ltr" className="field text-right" autoComplete="new-password" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton>עדכון סיסמה</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
