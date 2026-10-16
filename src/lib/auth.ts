import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Business, Profile } from "./types";

/**
 * הסשן של הבקשה הנוכחית — פעם אחת לכל בקשה (layout ודף חולקים אותו).
 * ה-middleware כבר אימת את המשתמש מול Supabase באותה בקשה, וכל שאילתה למסד נבדקת שוב לפי ה-JWT (RLS),
 * לכן כאן קוראים את הסשן מהעוגייה בלי סיבוב נוסף לשרת ההזדהות.
 * הפרופיל והעסק נטענים בשאילתה אחת.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*, business:businesses!profiles_business_id_fkey(*)")
    .eq("id", user.id)
    .maybeSingle<Profile & { business: Business | null }>();
  if (!data) return { supabase, user, profile: null, business: null };
  const { business, ...profile } = data;
  return { supabase, user, profile: profile as Profile, business: business ?? null };
});

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.profile) redirect("/login?e=noprofile");
  if (!s.profile.is_active) redirect("/blocked");
  return s as typeof s & { profile: Profile };
}

export async function requireBusiness() {
  const s = await requireSession();
  if (!s.business) {
    if (s.profile.is_super_admin) redirect("/admin");
    redirect("/blocked");
  }
  if (!s.business.is_active && !s.profile.is_super_admin) redirect("/blocked");
  return s as typeof s & { business: Business };
}

export async function requireSuperAdmin() {
  const s = await requireSession();
  if (!s.profile.is_super_admin) redirect("/quotes");
  return s;
}
