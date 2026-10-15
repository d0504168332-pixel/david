"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, FilePlus2, Users, X } from "lucide-react";
import { saveClient, deleteClient } from "@/app/actions/settings";
import SubmitButton from "@/components/SubmitButton";
import FormMessage from "@/components/FormMessage";
import type { Client } from "@/lib/types";

export default function ClientsManager({ clients, quoteCounts }: { clients: Client[]; quoteCounts: Record<string, number> }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [, start] = useTransition();
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) => [c.name, c.contact_name, c.phone, c.email].some((v) => v?.toLowerCase().includes(t)));
  }, [q, clients]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input className="field pr-10" placeholder="חיפוש לקוח" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> לקוח חדש
        </button>
      </div>

      {editing ? <ClientForm key={editing === "new" ? "new" : editing.id} client={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}

      {list.length === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Users className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold">{q ? "לא נמצאו לקוחות" : "עוד אין לקוחות שמורים"}</h3>
          <p className="mt-1 text-stone-500">לקוחות נשמרים אוטומטית כשמפיקים הצעה, או שאפשר להוסיף כאן.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/clients/${c.id}`} className="block truncate text-[16px] font-extrabold hover:text-brand hover:underline">{c.name}</Link>
                  {c.contact_name ? <div className="text-sm text-stone-600">{c.contact_name}</div> : null}
                  <div className="mt-1 truncate text-sm text-stone-500" dir="ltr" style={{ textAlign: "right" }}>
                    {[c.phone, c.email].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">{quoteCounts[c.id] ?? 0} הצעות</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/quotes/new?client=${c.id}`} className="btn-primary px-3 py-2 text-sm">
                  <FilePlus2 className="size-4" /> הצעה
                </Link>
                <Link href={`/clients/${c.id}`} className="btn-ghost px-3 py-2 text-sm">היסטוריה</Link>
                <button className="btn-ghost px-3 py-2 text-sm" onClick={() => setEditing(c)}>
                  <Pencil className="size-4" /> עריכה
                </button>
                {confirm === c.id ? (
                  <>
                    <button className="btn-danger px-3 py-2 text-sm" onClick={() => start(() => deleteClient(c.id))}>למחוק?</button>
                    <button className="btn-ghost px-3 py-2 text-sm" onClick={() => setConfirm(null)}>לא</button>
                  </>
                ) : (
                  <button className="btn-ghost px-3 py-2 text-sm text-stone-500" onClick={() => setConfirm(c.id)} aria-label="מחיקה">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientForm({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [state, action] = useActionState(saveClient, undefined);
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);
  return (
    <form action={action} className="card mb-5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-extrabold">{client ? "עריכת לקוח" : "לקוח חדש"}</h3>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100" aria-label="סגירה">
          <X className="size-5" />
        </button>
      </div>
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <F name="name" label="שם הלקוח / החברה *" def={client?.name} required />
        <F name="contact_name" label="איש קשר" def={client?.contact_name} />
        <F name="phone" label="טלפון" def={client?.phone} ltr />
        <F name="email" label="אימייל" def={client?.email} ltr type="email" />
        <F name="address" label="כתובת" def={client?.address} />
        <F name="tax_id" label="ח.פ. / ע.מ." def={client?.tax_id} />
      </div>
      <label className="label mt-3">הערות</label>
      <textarea name="notes" defaultValue={client?.notes ?? ""} className="field min-h-16" />
      <div className="mt-4 flex items-center gap-3">
        <SubmitButton>שמירה</SubmitButton>
        <FormMessage state={state?.error ? state : undefined} />
      </div>
    </form>
  );
}

function F({ name, label, def, ltr, type = "text", required }: { name: string; label: string; def?: string | null; ltr?: boolean; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} required={required} defaultValue={def ?? ""} dir={ltr ? "ltr" : undefined} className={`field ${ltr ? "text-right" : ""}`} />
    </div>
  );
}
