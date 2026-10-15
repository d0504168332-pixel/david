// קובץ נסיעה בפורמט של YIT — לפי קובץ ייצוא אמיתי שהתקבל (YITExport_1874.txt):
// טקסט מופרד בטאבים, 33 עמודות, בלי שורת כותרת, קידוד Windows-1255, סוף שורה CRLF,
// ירידת שורה בתוך שדה נכתבת כ-"^l".
import type { Quote } from "./types";

const COLS = 33;

function ddmmyyyy(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : "";
}

function duration(from?: string, to?: string) {
  if (!from || !to) return "";
  const [h1, m1] = from.split(":").map(Number);
  const [h2, m2] = to.split(":").map(Number);
  let mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (Number.isNaN(mins)) return "";
  if (mins < 0) mins += 24 * 60;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

const clean = (s: string | null | undefined) => (s ?? "").replace(/\t/g, " ").replace(/\r?\n/g, "^l").trim();

/** שורה אחת בפורמט YIT (מערך של 33 שדות) */
export function yitFields(q: Quote, opts: { tripType?: string } = {}) {
  const t = q.meta?.trip ?? {};
  const type = opts.tripType ?? "בין עירוני";
  const start = t.time ?? "";
  const end = t.round_trip ? t.return_time ?? "" : "";
  const dur = duration(start, end);

  const route = [t.origin, t.destination].filter(Boolean).join(" - ") + (t.round_trip ? " וחזרה" : "");

  const details: string[] = [];
  if (t.passengers) details.push(`${t.passengers} נוסעים`, "");
  details.push("מסלול: ");
  details.push(
    `${start ? start + " " : ""}${t.origin ?? ""}${q.client_contact || q.client_phone ? `, איש קשר: ${[q.client_contact, q.client_phone].filter(Boolean).join(" ")}` : ""}`
  );
  if (t.stops) details.push(`עצירות: ${t.stops}`);
  details.push("", `${t.destination ?? ""} - יעד`);
  if (t.round_trip) details.push("", `חזור${t.return_time ? ` בשעה ${t.return_time}` : ""}`);
  if (q.notes) details.push("", q.notes);

  const f: string[] = new Array(COLS).fill("");
  f[0] = ""; // מספר נסיעה — YIT מקצה
  f[1] = ddmmyyyy(t.date);
  f[4] = clean(route || q.title);
  f[7] = type;
  f[8] = type;
  f[9] = start;
  f[10] = end;
  f[11] = dur;
  f[12] = start;
  f[13] = end;
  f[14] = dur;
  f[15] = start;
  f[16] = end;
  f[17] = clean(q.client_name);
  f[18] = clean(q.client_tax_id);
  f[21] = clean(q.title);
  f[22] = details.map(clean).join("^l");
  f[23] = "0";
  f[27] = "0";
  f[28] = "0";
  f[29] = "0";
  f[31] = "0";
  return f;
}

export function yitText(q: Quote, opts?: { tripType?: string }) {
  return yitFields(q, opts).join("\t") + "\r\n";
}

// ---- קידוד Windows-1255 (עברית) ----
const EXTRA: Record<number, number> = {
  0x20aa: 0xa4, // ₪
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2026: 0x85,
  0x05f0: 0xd4,
  0x05f1: 0xd5,
  0x05f2: 0xd6,
  0x05f3: 0xd7, // ׳
  0x05f4: 0xd8, // ״
  0x00a0: 0xa0,
};

export function toWin1255(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    let b: number;
    if (c < 0x80) b = c;
    else if (c >= 0x05d0 && c <= 0x05ea) b = c - 0x05d0 + 0xe0; // א-ת
    else if (c >= 0x05b0 && c <= 0x05c3) b = c - 0x05b0 + 0xc0; // ניקוד
    else b = EXTRA[c] ?? 0x3f; // ?
    out[n++] = b;
  }
  return out.slice(0, n);
}
