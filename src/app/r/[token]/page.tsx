import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import RequestForm from "./RequestForm";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(token: string) {
  if (!UUID.test(token)) return null;
  const { data } = await createAdminClient()
    .from("businesses")
    .select("name,logo_url,primary_color,accent_color,phone,email,address,business_type,request_intro,is_active")
    .eq("request_token", token)
    .maybeSingle();
  return data && data.is_active && data.business_type === "transport" ? data : null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const b = await load((await params).token);
  return { title: b ? `בקשה להצעת מחיר – ${b.name}` : "בקשה להצעת מחיר", robots: { index: false } };
}

async function loadClient(businessToken: string, clientToken?: string) {
  if (!clientToken || !UUID.test(clientToken)) return null;
  const admin = createAdminClient();
  const { data: biz } = await admin.from("businesses").select("id").eq("request_token", businessToken).maybeSingle();
  if (!biz) return null;
  const { data } = await admin
    .from("clients")
    .select("name,contact_name,phone,email,address")
    .eq("business_id", biz.id)
    .eq("portal_token", clientToken)
    .maybeSingle();
  return data;
}

export default async function RequestPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ c?: string }> }) {
  const { token } = await params;
  const { c } = await searchParams;
  const b = await load(token);
  if (!b) notFound();
  const client = await loadClient(token, c);
  return (
    <div style={{ ["--brand" as string]: b.primary_color }} className="min-h-screen bg-stone-100">
      <header style={{ background: b.primary_color }} className="text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 pb-16 pt-8">
          {b.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" className="size-14 rounded-2xl bg-white object-contain p-1.5" />
          ) : (
            <div className="grid size-14 place-items-center rounded-2xl border border-white/40 bg-white/15 text-xl font-black">{b.name[0]}</div>
          )}
          <div>
            <div className="text-sm text-white/70">{client ? `שלום ${client.contact_name || client.name} 👋` : "בקשה להצעת מחיר"}</div>
            <h1 className="text-2xl font-extrabold">{b.name}</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-10 max-w-3xl px-4 pb-16">
        <RequestForm token={token} clientToken={client ? c : undefined} known={client} type="transport" intro={b.request_intro} businessName={b.name} contact={{ phone: b.phone, email: b.email }} />
      </main>
    </div>
  );
}
