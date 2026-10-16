import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * מרחק וזמן נסיעה בין שתי כתובות.
 * עם GOOGLE_MAPS_API_KEY — גוגל מפות (Distance Matrix, הכי מדויק).
 * בלי מפתח — OpenStreetMap (Nominatim לאיתור הכתובת + OSRM למסלול), חינמי.
 */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s?.profile) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const from = (req.nextUrl.searchParams.get("from") ?? "").trim().slice(0, 200);
  const to = (req.nextUrl.searchParams.get("to") ?? "").trim().slice(0, 200);
  if (!from || !to) return NextResponse.json({ error: "חסר מוצא או יעד" }, { status: 400 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  try {
    if (key) {
      const u = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
      u.searchParams.set("origins", from);
      u.searchParams.set("destinations", to);
      u.searchParams.set("region", "il");
      u.searchParams.set("language", "he");
      u.searchParams.set("key", key);
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const el = j?.rows?.[0]?.elements?.[0];
      if (el?.status === "OK") {
        return NextResponse.json({
          km: Math.round((el.distance.value / 1000) * 10) / 10,
          minutes: Math.round(el.duration.value / 60),
          source: "google",
        });
      }
      // נופלים לגיבוי
    }
    const geo = async (q: string) => {
      const u = new URL("https://nominatim.openstreetmap.org/search");
      u.searchParams.set("q", q);
      u.searchParams.set("format", "json");
      u.searchParams.set("limit", "1");
      u.searchParams.set("countrycodes", "il");
      const r = await fetch(u, {
        headers: { "user-agent": "Sgarnu/1.0 (quotes app)", "accept-language": "he" },
        signal: AbortSignal.timeout(8000),
      });
      const j = (await r.json()) as { lat: string; lon: string }[];
      return j[0] ? { lat: Number(j[0].lat), lon: Number(j[0].lon) } : null;
    };
    const [a, b] = await Promise.all([geo(from), geo(to)]);
    if (!a || !b) return NextResponse.json({ error: `לא נמצאה הכתובת: ${!a ? from : to}` }, { status: 404 });
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,
      { signal: AbortSignal.timeout(8000) }
    );
    const j = await r.json();
    const route = j?.routes?.[0];
    if (!route) return NextResponse.json({ error: "לא נמצא מסלול" }, { status: 404 });
    return NextResponse.json({
      km: Math.round((route.distance / 1000) * 10) / 10,
      // OSRM לא מתחשב בפקקים — מוסיפים 15% לזמן
      minutes: Math.round((route.duration / 60) * 1.15),
      source: "osm",
    });
  } catch {
    return NextResponse.json({ error: "חישוב המרחק נכשל, נסו שוב או הקלידו ק״מ ידנית" }, { status: 502 });
  }
}
