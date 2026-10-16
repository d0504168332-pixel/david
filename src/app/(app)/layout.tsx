import { requireSession } from "@/lib/auth";
import Nav from "@/components/Nav";
import InstallApp from "@/components/InstallApp";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const brand = s.business?.primary_color || "#16263F";
  let newRequests = 0;
  if (s.business?.business_type === "transport") {
    const { count } = await s.supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("business_id", s.business.id).eq("status", "new");
    newRequests = count ?? 0;
  }
  return (
    <div style={{ ["--brand" as string]: brand }} className="min-h-screen">
      <Nav
        user={{ name: s.profile.full_name, email: s.profile.email, title: s.profile.job_title }}
        business={s.business ? { name: s.business.name, logo: s.business.logo_url } : null}
        isSuper={s.profile.is_super_admin}
        isManager={s.profile.business_role === "manager"}
        hasBusiness={!!s.business}
        newRequests={newRequests}
        isTransport={s.business?.business_type === "transport"}
      />
      <div className="lg:pr-72 print:pr-0">
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10 print:max-w-none print:p-0">
          <InstallApp />
          {children}
        </main>
      </div>
    </div>
  );
}
