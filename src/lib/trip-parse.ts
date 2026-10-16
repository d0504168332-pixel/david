// זיהוי פרטי נסיעה מתוך טקסט חופשי של מייל (מוצא, יעד, תאריך, שעה, נוסעים, הלוך-חזור)
import type { Trip } from "./types";

const PLACE = "([א-ת\"״'׳A-Za-z][א-ת\"״'׳A-Za-z\\- ]{1,30}?)";
const STOP_WORDS = /\s+(?:ב-?\d|בתאריך|ביום|בשעה|ל-?\d|עם|עבור|של|הלוך|וחזרה|חזור|כולל|ל?כ-?\d|ב?יום)\b.*$/;

function tidy(s?: string) {
  if (!s) return undefined;
  const v = s.replace(STOP_WORDS, "").replace(/[.,;:!?]+$/, "").trim();
  return v.length >= 2 ? v : undefined;
}

function toIsoDate(d: number, m: number, y?: number) {
  const now = new Date();
  let year = y ?? now.getFullYear();
  if (year < 100) year += 2000;
  if (!y) {
    const cand = new Date(year, m - 1, d);
    if (cand.getTime() < now.getTime() - 86400000) year += 1; // תאריך שעבר השנה → השנה הבאה
  }
  if (d < 1 || d > 31 || m < 1 || m > 12) return undefined;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function extractTrip(raw: string): Trip | null {
  const text = raw.replace(/\r/g, "");
  const flat = text.replace(/\s+/g, " ");
  const t: Trip = {};

  // מוצא / יעד — שדות מפורשים
  const o = text.match(/(?:מוצא|נקודת איסוף|איסוף מ?|יציאה מ)\s*[:\-]\s*([^\n]+)/);
  const d = text.match(/(?:יעד|נקודת פיזור|פיזור ב?)\s*[:\-]\s*([^\n]+)/);
  if (o) t.origin = tidy(o[1]);
  if (d) t.destination = tidy(d[1]);
  // "מתל אביב לירושלים" / "מ-חיפה ל-אילת"
  if (!t.origin || !t.destination) {
    const m = flat.match(new RegExp(`(?:^|\\s)מ-?${PLACE}\\s+ל-?${PLACE}(?=[\\s,.]|$)`));
    if (m) {
      t.origin ??= tidy(m[1]);
      t.destination ??= tidy(m[2]);
    }
  }

  // תאריך 20/11, 20.11.2026
  const dm = flat.match(/(?:^|[^\d])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\d)/);
  if (dm) t.date = toIsoDate(Number(dm[1]), Number(dm[2]), dm[3] ? Number(dm[3]) : undefined);

  // שעות
  const times = [...flat.matchAll(/(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/g)].map((x) => `${x[1].padStart(2, "0")}:${x[2]}`);
  if (times[0]) t.time = times[0];

  // נוסעים
  const p = flat.match(/(\d{1,4})\s*(?:נוסעים|אנשים|משתתפים|מקומות|ילדים|עובדים|חניכים|תלמידים)/) || flat.match(/(?:נוסעים|משתתפים)\s*[:\-]?\s*(\d{1,4})/);
  if (p) t.passengers = Number(p[1]);

  // הלוך-חזור
  if (/הלוך[\s\-־]*(?:ו?חזור|וחזרה)|וחזרה|חזרה בשעה|חזור בשעה/.test(flat)) {
    t.round_trip = true;
    const r = flat.match(/(?:חזור|חזרה)[^\d]{0,12}([01]?\d|2[0-3]):([0-5]\d)/);
    if (r) t.return_time = `${r[1].padStart(2, "0")}:${r[2]}`;
    else if (times[1]) t.return_time = times[1];
  }

  const st = text.match(/(?:עצירות|עצירה|דרך)\s*[:\-]\s*([^\n]+)/);
  if (st) t.stops = st[1].trim().slice(0, 200);

  const found = t.origin || t.destination || (t.date && (t.time || t.passengers));
  return found ? t : null;
}
