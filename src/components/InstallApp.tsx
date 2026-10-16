"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** רושם את ה-Service Worker (נטען בכל האתר) */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

const KEY = "qc-install-dismissed";

/** באנר "התקנה כאפליקציה" — אנדרואיד/כרום: כפתור התקנה; אייפון: הוראות קצרות */
export default function InstallApp({ variant = "banner" }: { variant?: "banner" | "link" }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const ua = navigator.userAgent;
    setIos(/iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document));
    try {
      setDismissed(localStorage.getItem(KEY) === "1");
    } catch {
      setDismissed(false);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;

  const install = async () => {
    if (evt) {
      await evt.prompt();
      const r = await evt.userChoice.catch(() => null);
      if (r?.outcome === "accepted") setInstalled(true);
      setEvt(null);
    } else setShowIos(true);
  };
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  const iosHelp = showIos ? (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center" onClick={() => setShowIos(false)}>
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <b className="text-lg">התקנה באייפון</b>
          <button className="rounded-lg p-1 text-stone-500" onClick={() => setShowIos(false)} aria-label="סגירה">
            <X className="size-5" />
          </button>
        </div>
        <ol className="space-y-3 text-[15px]">
          <li className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 font-bold text-brand">1</span>
            <span>
              לוחצים על כפתור השיתוף <Share className="inline size-4 align-[-2px]" /> בתחתית ספארי
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 font-bold text-brand">2</span>
            <span>
              בוחרים <b>&quot;הוספה למסך הבית&quot;</b> <SquarePlus className="inline size-4 align-[-2px]" />
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 font-bold text-brand">3</span>
            <span>
              לוחצים <b>&quot;הוסף&quot;</b> — והאפליקציה מופיעה במסך הבית
            </span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-stone-500">חשוב: לפתוח את האתר בספארי (לא מתוך וואטסאפ או כרום).</p>
      </div>
    </div>
  ) : null;

  if (variant === "link") {
    return (
      <>
        <button onClick={install} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-ink">
          <Download className="size-[18px]" strokeWidth={2.2} /> התקנה כאפליקציה
        </button>
        {iosHelp}
      </>
    );
  }

  if (dismissed) return iosHelp;
  return (
    <>
      <div className="no-print mb-5 flex items-center gap-3 rounded-2xl border border-brand/20 bg-white p-3 shadow-sm lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="size-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">התקנה כאפליקציה בטלפון</div>
          <div className="text-xs text-stone-500">אייקון במסך הבית, נפתח במסך מלא</div>
        </div>
        <button onClick={install} className="btn-primary h-9 px-3 text-sm">
          התקנה
        </button>
        <button onClick={dismiss} className="rounded-lg p-1 text-stone-400" aria-label="לא עכשיו">
          <X className="size-4" />
        </button>
      </div>
      {iosHelp}
    </>
  );
}
