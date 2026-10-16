"use client";

import { useTransition } from "react";
import { LayoutTemplate, Trash2 } from "lucide-react";
import { deleteTemplate } from "@/app/actions/templates";

export default function TemplatesList({ templates }: { templates: { id: string; name: string; title: string | null; count: number }[] }) {
  const [pending, start] = useTransition();
  return (
    <section className="card mt-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[17px] font-extrabold">
        <LayoutTemplate className="size-5 text-brand" /> תבניות הצעה
      </h2>
      <p className="mb-4 text-sm text-stone-500">
        שומרים תבנית מתוך מסך עריכת ההצעה (כפתור &quot;שמירה כתבנית&quot;), ובהצעה חדשה בוחרים &quot;התחלה מתבנית&quot;.
      </p>
      {templates.length === 0 ? (
        <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">עוד לא נשמרו תבניות.</div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{t.name}</div>
                <div className="truncate text-sm text-stone-500">
                  {[t.title, `${t.count} פריטים`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                title="מחיקת התבנית"
                disabled={pending}
                onClick={() => start(() => deleteTemplate(t.id))}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
