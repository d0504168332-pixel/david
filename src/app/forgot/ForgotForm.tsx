"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";

export default function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">אימייל</label>
        <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="field text-right" placeholder="name@company.co.il" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="שולח...">שליחת קישור</SubmitButton>
    </form>
  );
}
