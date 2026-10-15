"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { UserPlus, Pencil, X, Power, Trash2, KeyRound, Crown } from "lucide-react";
import { createMember, updateMember, setMemberActive, deleteMember } from "@/app/actions/admin";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Profile } from "@/lib/types";

function genPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export default function MembersPanel({ businessId, members, selfId }: { businessId: string; members: Profile[]; selfId: string }) {
  const [adding, setAdding] = useState(members.length === 0);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">משתמשים בעסק</h2>
          <p className="text-sm text-stone-500">לכל משתמש אימייל וסיסמה משלו, וחתימה וחותמת אישיות</p>
        </div>
        {!adding ? (
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" /> משתמש חדש
          </button>
        ) : null}
      </div>

      {adding ? <AddMember businessId={businessId} onClose={() => setAdding(false)} /> : null}

      {members.length === 0 ? (
        <p className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">עוד אין משתמשים בעסק הזה.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {members.map((m) => (
            <div key={m.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className={`grid size-10 place-items-center rounded-full font-bold ${m.is_active ? "bg-brand/10 text-brand" : "bg-stone-100 text-stone-400"}`}>
                  {m.full_name?.[0] ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{m.full_name}</span>
                    {m.job_title ? <span className="text-sm text-stone-500">{m.job_title}</span> : null}
                    {m.business_role === "manager" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                        <Crown className="size-3" /> מנהל העסק
                      </span>
                    ) : null}
                    {!m.is_active ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">מושבת</span> : null}
                    {m.id === selfId ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600">אתה</span> : null}
                  </div>
                  <div className="truncate text-sm text-stone-500" dir="ltr" style={{ textAlign: "right" }}>
                    {[m.email, m.phone].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setEditing(editing === m.id ? null : m.id)}>
                    <Pencil className="size-3.5" /> עריכה
                  </button>
                  {m.id !== selfId ? (
                    <>
                      <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => start(() => setMemberActive(m.id, businessId, !m.is_active))}>
                        <Power className="size-3.5" /> {m.is_active ? "השבתה" : "הפעלה"}
                      </button>
                      {confirmDel === m.id ? (
                        <>
                          <button className="btn-danger px-3 py-1.5 text-sm" onClick={() => start(() => deleteMember(m.id, businessId))}>למחוק סופית?</button>
                          <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setConfirmDel(null)}>לא</button>
                        </>
                      ) : (
                        <button className="btn-ghost px-2.5 py-1.5 text-sm text-stone-500" aria-label="מחיקה" onClick={() => setConfirmDel(m.id)}>
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
              {editing === m.id ? <EditMember member={m} businessId={businessId} onClose={() => setEditing(null)} /> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AddMember({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const [state, action] = useActionState(createMember, undefined);
  const [pw, setPw] = useState("");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (state?.ok) setFormKey((k) => k + 1);
  }, [state]);
  return (
    <div className="mb-5 rounded-2xl border border-brand/20 bg-brand/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-extrabold">הוספת משתמש</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-500 hover:bg-white" aria-label="סגירה">
          <X className="size-5" />
        </button>
      </div>
      <form key={formKey} action={action} className="space-y-3">
        <input type="hidden" name="business_id" value={businessId} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">שם מלא *</label>
            <input name="full_name" required className="field" />
          </div>
          <div>
            <label className="label">תפקיד</label>
            <input name="job_title" placeholder="מנכ״ל / מנהלת שיווק" className="field" />
          </div>
          <div>
            <label className="label">טלפון</label>
            <input name="phone" dir="ltr" className="field text-right" />
          </div>
          <div>
            <label className="label">אימייל (שם משתמש) *</label>
            <input name="email" type="email" required dir="ltr" className="field text-right" />
          </div>
          <div>
            <label className="label">סיסמה ראשונית *</label>
            <div className="flex gap-2">
              <input name="password" required minLength={8} dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} className="field text-right font-mono" autoComplete="new-password" />
              <button type="button" className="btn-ghost shrink-0 px-3" title="יצירת סיסמה" onClick={() => setPw(genPassword())}>
                <KeyRound className="size-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="label">הרשאה בעסק</label>
            <select name="business_role" className="field" defaultValue="member">
              <option value="member">משתמש — מפיק הצעות</option>
              <option value="manager">מנהל העסק — גם עורך את פרטי העסק</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="יוצר...">
            <UserPlus className="size-4" /> יצירת משתמש
          </SubmitButton>
          <FormMessage state={state} />
        </div>
        {state?.ok ? <p className="text-sm text-stone-600">שלח למשתמש את האימייל והסיסמה. הוא יוכל להחליף סיסמה ולהגדיר חתימה בדף "חתימה ופרופיל".</p> : null}
      </form>
    </div>
  );
}

function EditMember({ member, businessId, onClose }: { member: Profile; businessId: string; onClose: () => void }) {
  const [state, action] = useActionState(updateMember, undefined);
  const [pw, setPw] = useState("");
  return (
    <form action={action} className="mt-3 rounded-2xl bg-stone-50 p-4">
      <input type="hidden" name="user_id" value={member.id} />
      <input type="hidden" name="business_id" value={businessId} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label">שם מלא</label>
          <input name="full_name" defaultValue={member.full_name} required className="field" />
        </div>
        <div>
          <label className="label">תפקיד</label>
          <input name="job_title" defaultValue={member.job_title ?? ""} className="field" />
        </div>
        <div>
          <label className="label">טלפון</label>
          <input name="phone" defaultValue={member.phone ?? ""} dir="ltr" className="field text-right" />
        </div>
        <div>
          <label className="label">הרשאה</label>
          <select name="business_role" defaultValue={member.business_role} className="field">
            <option value="member">משתמש</option>
            <option value="manager">מנהל העסק</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">סיסמה חדשה (ריק = ללא שינוי)</label>
          <div className="flex gap-2">
            <input name="password" minLength={8} dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} className="field text-right font-mono" autoComplete="new-password" />
            <button type="button" className="btn-ghost shrink-0 px-3" title="יצירת סיסמה" onClick={() => setPw(genPassword())}>
              <KeyRound className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SubmitButton>שמירה</SubmitButton>
        <button type="button" className="btn-ghost" onClick={onClose}>סגירה</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
