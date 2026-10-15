"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">אימייל</label>
        <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="field text-right" placeholder="name@company.co.il" />
      </div>
      <div>
        <label className="label" htmlFor="password">סיסמה</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" dir="ltr" className="field text-right" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="מתחבר...">כניסה</SubmitButton>
      <p className="text-center text-sm text-stone-500">שכחת סיסמה? פנה למנהל המערכת לאיפוס.</p>
    </form>
  );
}
