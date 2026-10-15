"use client";

import { useActionState } from "react";
import { setupSuperAdmin } from "@/app/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function SetupForm() {
  const [state, action] = useActionState(setupSuperAdmin, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">שם מלא</label>
        <input id="full_name" name="full_name" required className="field" />
      </div>
      <div>
        <label className="label" htmlFor="email">אימייל מנהל המערכת</label>
        <input id="email" name="email" type="email" required dir="ltr" className="field text-right" />
      </div>
      <div>
        <label className="label" htmlFor="password">בחר סיסמה (8 תווים לפחות)</label>
        <input id="password" name="password" type="password" required minLength={8} dir="ltr" className="field text-right" autoComplete="new-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="יוצר...">יצירת חשבון מנהל</SubmitButton>
    </form>
  );
}
