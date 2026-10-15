import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Business, Profile } from "./types";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  let business: Business | null = null;
  if (profile?.business_id) {
    const { data } = await supabase.from("businesses").select("*").eq("id", profile.business_id).maybeSingle<Business>();
    business = data ?? null;
  }
  return { supabase, user, profile: profile ?? null, business };
}

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
