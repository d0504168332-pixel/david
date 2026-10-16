"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/auth";
import type { QuoteItem, QuoteMeta } from "@/lib/types";

export async function saveTemplate(input: {
  name: string;
  title: string;
  items: QuoteItem[];
  notes: string;
  terms: string;
  meta?: QuoteMeta;
}): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, profile, business } = await requireBusiness();
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: "נא לתת שם לתבנית" };
  // בתבנית שומרים את פרטי הנסיעה הקבועים בלבד (בלי תאריכים ומרחק)
  const trip = input.meta?.trip
    ? { round_trip: input.meta.trip.round_trip, time: input.meta.trip.time, return_time: input.meta.trip.return_time }
    : undefined;
  const row = {
    business_id: business.id,
    created_by: profile.id,
    name,
    title: input.title.trim() || null,
    items: (input.items ?? [])
      .filter((i) => i.description?.trim())
      .map((i) => ({ ...i, option: undefined })),
    notes: input.notes.trim() || null,
    terms: input.terms.trim() || null,
    meta: trip ? { trip } : {},
  };
  const { data: existing } = await supabase.from("quote_templates").select("id").eq("business_id", business.id).eq("name", name).maybeSingle();
  const { error } = existing
    ? await supabase.from("quote_templates").update(row).eq("id", existing.id)
    : await supabase.from("quote_templates").insert(row);
  if (error) return { error: "שמירת התבנית נכשלה: " + error.message };
  revalidatePath("/quotes/new");
  revalidatePath("/automation");
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  const { supabase } = await requireBusiness();
  await supabase.from("quote_templates").delete().eq("id", id);
  revalidatePath("/automation");
  revalidatePath("/quotes/new");
}
