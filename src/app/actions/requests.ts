"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBusiness } from "@/lib/auth";
import type { Trip } from "@/lib/types";

export type RequestInput = {
  token: string;
  client_token?: string;
  client_name: string;
  client_contact: string;
  client_phone: string;
  client_email: string;
  request_text: string;
  items: { description: string; quantity: number }[];
  trip: Trip | null;
  notes: string;
  website?: string; // מלכודת לבוטים — שדה מוסתר שאמור להישאר ריק
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cut = (s: string | undefined, n: number) => {
  const v = (s ?? "").trim().slice(0, n);
  return v.length ? v : null;
};

/** לקוח שולח בקשה להצעת מחיר מהדף הציבורי של העסק */
export async function submitRequest(input: RequestInput): Promise<{ ok?: boolean; error?: string }> {
  if (input.website) return { ok: true };
  if (!UUID.test(input.token)) return { error: "הקישור אינו תקין" };
  if (!input.client_name?.trim()) return { error: "נא למלא שם או שם חברה" };
  if (!input.client_phone?.trim() && !input.client_email?.trim()) return { error: "נא להשאיר טלפון או אימייל כדי שנוכל לחזור אליכם" };
  const items = (input.items ?? [])
    .filter((i) => i.description?.trim())
    .slice(0, 50)
    .map((i) => ({ description: i.description.trim().slice(0, 200), quantity: Number(i.quantity) > 0 ? Math.min(Number(i.quantity), 100000) : 1 }));
  const trip = input.trip
    ? Object.fromEntries(Object.entries(input.trip).filter(([, v]) => v !== "" && v !== null && v !== undefined))
    : null;
  if (!items.length && !input.request_text?.trim() && !(trip && Object.keys(trip).length)) return { error: "נא לפרט מה תרצו לקבל" };

  const admin = createAdminClient();
  const { data: biz } = await admin.from("businesses").select("id,is_active").eq("request_token", input.token).maybeSingle();
  if (!biz || !biz.is_active) return { error: "הקישור אינו פעיל" };

  // הגבלה פשוטה נגד הצפה: עד 20 בקשות לעסק בשעה
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("quote_requests").select("id", { count: "exact", head: true }).eq("business_id", biz.id).gte("created_at", since);
  if ((count ?? 0) > 20) return { error: "התקבלו הרבה בקשות בזמן קצר, נסו שוב מאוחר יותר" };

  // לקוח קבוע שנכנס מהקישור האישי שלו
  let client_id: string | null = null;
  if (input.client_token && UUID.test(input.client_token)) {
    const { data: c } = await admin.from("clients").select("id").eq("business_id", biz.id).eq("portal_token", input.client_token).maybeSingle();
    client_id = c?.id ?? null;
  }

  const { error } = await admin.from("quote_requests").insert({
    business_id: biz.id,
    client_id,
    client_name: input.client_name.trim().slice(0, 120),
    client_contact: cut(input.client_contact, 120),
    client_phone: cut(input.client_phone, 40),
    client_email: cut(input.client_email, 120),
    request_text: cut(input.request_text, 4000),
    items,
    trip: trip && Object.keys(trip).length ? trip : null,
    notes: cut(input.notes, 2000),
  });
  if (error) return { error: "השליחה נכשלה, נסו שוב" };
  revalidatePath("/requests");
  return { ok: true };
}

export async function setRequestStatus(id: string, status: "new" | "quoted" | "closed") {
  const { supabase } = await requireBusiness();
  await supabase.from("quote_requests").update({ status }).eq("id", id);
  revalidatePath("/requests");
}
