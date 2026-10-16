"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { submitLead } from "@/app/actions/leads";
import SubmitButton from "@/components/SubmitButton";

export default function JoinForm() {
  const [state, action] = useActionState(submitLead, undefined);
  if (state?.ok)
    return (
      <div className="rounded-2xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h2 className="mt-3 text-lg font-extrabold">הפרטים התקבלו!</h2>
        <p className="mt-1 text-stone-600">נחזור אליכם בהקדם לפתיחת החשבון.</p>
        <Link href="/login" className="btn-ghost mt-4 inline-flex">חזרה לדף הכניסה</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-3.5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <label className="label" htmlFor="full_name">שם מלא *</label>
        <input id="full_name" name="full_name" required className="field" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="business_name">שם העסק</label>
        <input id="business_name" name="business_name" className="field" autoComplete="organization" />
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">טלפון *</label>
          <input id="phone" name="phone" type="tel" required dir="ltr" className="field text-right" autoComplete="tel" placeholder="050-0000000" />
        </div>
        <div>
          <label className="label" htmlFor="email">אימייל</label>
          <input id="email" name="email" type="email" dir="ltr" className="field text-right" autoComplete="email" />
        </div>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="business_type">תחום</label>
          <select id="business_type" name="business_type" className="field">
            <option value="">בחירה…</option>
            <option>הסעות ותחבורה</option>
            <option>שיפוצים וקבלנות</option>
            <option>אירועים</option>
            <option>שירותים</option>
            <option>אחר</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="team_size">כמה עובדים יפיקו הצעות?</label>
          <select id="team_size" name="team_size" className="field">
            <option value="">בחירה…</option>
            <option>רק אני</option>
            <option>2–5</option>
            <option>6–15</option>
            <option>16+</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="message">משהו שחשוב שנדע?</label>
        <textarea id="message" name="message" rows={3} className="field" />
      </div>
      {state?.error ? <div className="text-sm font-semibold text-rose-600">{state.error}</div> : null}
      <SubmitButton className="btn-primary w-full py-3" pendingText="שולח...">שליחת פרטים</SubmitButton>
    </form>
  );
}
