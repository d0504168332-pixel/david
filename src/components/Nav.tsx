"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Plus, Users, Building2, UserRound, ShieldCheck, LogOut, MailPlus } from "lucide-react";
import { signOut } from "@/app/actions/auth";

type Props = {
  user: { name: string; email: string; title: string | null };
  business: { name: string; logo: string | null } | null;
  isSuper: boolean;
  isManager: boolean;
  hasBusiness: boolean;
};

export default function Nav({ user, business, isSuper, isManager, hasBusiness }: Props) {
  const path = usePathname();
  const items = [
    ...(hasBusiness
      ? [
          { href: "/quotes", label: "הצעות מחיר", icon: FileText },
          { href: "/quotes/new", label: "הצעה חדשה", icon: Plus },
          { href: "/quotes/import", label: "ממייל להצעה", icon: MailPlus },
          { href: "/clients", label: "לקוחות", icon: Users },
          ...(isManager || isSuper ? [{ href: "/business", label: "פרטי העסק", icon: Building2 }] : []),
        ]
      : []),
    { href: "/profile", label: "חתימה ופרופיל", icon: UserRound },
    ...(isSuper ? [{ href: "/admin", label: "ניהול מערכת", icon: ShieldCheck }] : []),
  ];
  const active = (href: string) =>
    href === "/quotes" ? path === "/quotes" || (/^\/quotes\/(?!new|import)/.test(path)) : path.startsWith(href);

  return (
    <>
      {/* דסקטופ */}
      <aside className="no-print fixed inset-y-0 right-0 z-30 hidden w-72 flex-col border-l border-stone-200/80 bg-white/80 px-5 py-6 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 px-2">
          <BizMark business={business} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold">{business?.name ?? "QuoteCraft"}</div>
            <div className="text-xs text-stone-500">הצעות מחיר מעוצבות</div>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {items.map((it) => {
            const Icon = it.icon;
            const on = active(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition ${
                  on ? "bg-brand text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-ink"
                }`}
              >
                <Icon className="size-[18px]" strokeWidth={2.2} />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-stone-200 bg-stone-50/70 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-brand/10 text-sm font-bold text-brand">
              {user.name?.[0] ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{user.name || user.email}</div>
              <div className="truncate text-xs text-stone-500">{user.title || user.email}</div>
            </div>
            <form action={signOut}>
              <button title="התנתקות" className="rounded-lg p-2 text-stone-500 hover:bg-white hover:text-rose-600">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* מובייל — עליון */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <BizMark business={business} small />
          <span className="truncate font-extrabold">{business?.name ?? "QuoteCraft"}</span>
        </div>
        <form action={signOut}>
          <button className="rounded-lg p-2 text-stone-500" title="התנתקות">
            <LogOut className="size-5" />
          </button>
        </form>
      </header>

      {/* מובייל — תחתון */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-stone-200 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur lg:hidden">
        {items.filter((it) => it.href !== "/business" && it.href !== "/quotes/new").map((it) => {
          const Icon = it.icon;
          const on = active(it.href);
          return (
            <Link key={it.href} href={it.href} className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[11px] font-semibold ${on ? "text-brand" : "text-stone-500"}`}>
              <Icon className="size-5" strokeWidth={on ? 2.5 : 2} />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function BizMark({ business, small = false }: { business: Props["business"]; small?: boolean }) {
  const cls = small ? "size-8 rounded-lg" : "size-11 rounded-xl";
  if (business?.logo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={business.logo} alt="" className={`${cls} border border-stone-200 bg-white object-contain p-1`} />;
  return (
    <div className={`${cls} grid place-items-center bg-brand font-black text-white`}>
      {(business?.name ?? "Q").trim()[0]}
    </div>
  );
}
