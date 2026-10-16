"use client";

import { useActionState } from "react";
import { setNewPassword } from "@/app/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function ResetForm() {
  const [state, action] = useActionState(setNewPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">סיסמה חדשה (לפחות 8 תווים)</label>
        <input id="password" name="password" type="password" minLength={8} required dir="ltr" className="field text-right" autoComplete="new-password" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">אימות סיסמה</label>
        <input id="confirm" name="confirm" type="password" minLength={8} required dir="ltr" className="field text-right" autoComplete="new-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="שומר...">שמירה וכניסה</SubmitButton>
    </form>
  );
}
