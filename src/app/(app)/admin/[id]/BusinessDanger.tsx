"use client";

import { useState, useTransition } from "react";
import { assignSelf, deleteBusiness, setBusinessActive } from "@/app/actions/admin";

export default function BusinessDanger({ businessId, active, isMine }: { businessId: string; active: boolean; isMine: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [, start] = useTransition();
  return (
    <section className="card mt-10 space-y-4 p-5">
      <h2 className="text-lg font-extrabold">פעולות נוספות</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <div className="font-bold">{isMine ? "אתה משויך לעסק הזה" : "להפיק הצעות בשם העסק הזה"}</div>
          <div className="text-sm text-stone-500">
            {isMine ? "ההצעות שתפיק יצאו על הנייר של העסק הזה." : "שייך את החשבון שלך לעסק כדי לעבוד בו בעצמך."}
          </div>
        </div>
        <button className="btn-ghost" onClick={() => start(() => assignSelf(isMine ? null : businessId))}>
          {isMine ? "ניתוק החשבון שלי" : "שיוך החשבון שלי"}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <div className="font-bold">{active ? "השבתת העסק" : "הפעלת העסק"}</div>
          <div className="text-sm text-stone-500">עסק מושבת — המשתמשים שלו לא יכולים להיכנס, וקישורי ההצעות לא פעילים.</div>
        </div>
        <button className="btn-ghost" onClick={() => start(() => setBusinessActive(businessId, !active))}>
          {active ? "השבתה" : "הפעלה"}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold text-rose-700">מחיקת העסק</div>
          <div className="text-sm text-stone-500">מוחק את העסק, הלקוחות וההצעות שלו לצמיתות.</div>
        </div>
        {confirm ? (
          <div className="flex gap-2">
            <button className="btn-danger" onClick={() => start(() => deleteBusiness(businessId))}>כן, למחוק לצמיתות</button>
            <button className="btn-ghost" onClick={() => setConfirm(false)}>ביטול</button>
          </div>
        ) : (
          <button className="btn-danger" onClick={() => setConfirm(true)}>מחיקה</button>
        )}
      </div>
    </section>
  );
}
