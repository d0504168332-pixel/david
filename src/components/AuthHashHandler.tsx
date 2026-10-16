"use client";

import { useEffect, useState } from "react";

/**
 * כשהקישור מהמייל חוזר לכתובת הראשית של האתר (ולא לדף האישור),
 * הטוקנים מגיעים אחרי # — מעבירים אותם לדף האישור, וממשיכים לבחירת סיסמה חדשה.
 */
export default function AuthHashHandler() {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get("access_token") && h.get("refresh_token")) {
      const next = h.get("type") === "recovery" ? "/reset-password" : "/";
      location.replace(`/auth/confirm?next=${encodeURIComponent(next)}${location.hash}`);
    } else if (h.get("error_code") || h.get("error")) {
      setExpired(true);
      history.replaceState(null, "", location.pathname);
    }
  }, []);
  if (!expired) return null;
  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      הקישור מהמייל פג תוקף או כבר נוצל.{" "}
      <a href="/forgot" className="font-bold underline">לשלוח קישור חדש ←</a>
    </div>
  );
}
