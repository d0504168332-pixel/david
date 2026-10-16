"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/** חזרה מקישור במייל: הטוקנים מגיעים אחרי # בכתובת — שומרים סשן וממשיכים */
export default function ConfirmPage() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("next") ?? "/";
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
    const hash = new URLSearchParams(location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const code = params.get("code");
    if (code) {
      location.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
      return;
    }
    if (!access_token || !refresh_token) {
      setFailed(true);
      return;
    }
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { detectSessionInUrl: false },
    })
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => (error ? setFailed(true) : location.replace(next)));
  }, []);
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      {failed ? (
        <div>
          <p className="font-bold">הקישור פג תוקף או כבר נוצל.</p>
          <a href="/forgot" className="btn-primary mt-4 inline-flex">בקשת קישור חדש</a>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-stone-600">
          <span className="size-5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" /> מתחבר…
        </div>
      )}
    </main>
  );
}
