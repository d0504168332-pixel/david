// זיהוי פריטים דומים בהצעות קודמות והתראה על פער מחירים

export type PastPrice = {
  quote_id: string;
  number: number | null;
  client_name: string;
  issue_date: string;
  description: string;
  unit_price: number;
};

export type PriceMatch = PastPrice & { similarity: number; diffPct: number };

const FINALS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const STOP = new Set(["של", "עם", "על", "את", "כולל", "עבור", "the", "and", "for", "of", "-"]);

export function tokens(s: string) {
  return s
    .toLowerCase()
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/["'״׳`.,:;()\[\]{}!?/\\|+*_=-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
}

function sameWord(a: string, b: string) {
  if (a === b) return true;
  if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;
  const near = (x: string, y: string) => {
    const [s, l] = x.length <= y.length ? [x, y] : [y, x];
    // צילום / צילומי, מוצר / מוצרים
    return s.length >= 3 && l.startsWith(s) && l.length - s.length <= 2;
  };
  if (near(a, b)) return true;
  // אות שימוש בתחילת מילה: הלוגו / לוגו, ועיצוב / עיצוב
  const strip = (w: string) => (w.length >= 4 && /^[והבלמש]/.test(w) ? w.slice(1) : w);
  return near(strip(a), b) || near(a, strip(b));
}

export function similarity(a: string, b: string) {
  const A = [...new Set(tokens(a))];
  const B = [...new Set(tokens(b))];
  if (!A.length || !B.length) return 0;
  const inter = A.filter((x) => B.some((y) => sameWord(x, y))).length;
  const jaccard = inter / (A.length + B.length - inter);
  // אחד התיאורים מוכל כמעט כולו בשני ("עיצוב לוגו" ↔ "עיצוב הלוגו + 3 סקיצות")
  const contain = Math.min(A.length, B.length) >= 2 ? (inter / Math.min(A.length, B.length)) * 0.85 : 0;
  return Math.max(jaccard, contain);
}

/** מחזיר את ההתאמות הדומות ביותר (מהחדשה לישנה) */
export function findSimilar(description: string, history: PastPrice[], min = 0.6): PriceMatch[] {
  if (tokens(description).length === 0) return [];
  return history
    .map((h) => ({ ...h, similarity: similarity(description, h.description), diffPct: 0 }))
    .filter((h) => h.similarity >= min && h.unit_price > 0)
    .sort((a, b) => (b.issue_date > a.issue_date ? 1 : b.issue_date < a.issue_date ? -1 : b.similarity - a.similarity))
    .slice(0, 5);
}

/** בדיקת פער: לעומת ההצעה האחרונה הדומה, ולעומת הממוצע */
export function checkPrice(description: string, price: number, history: PastPrice[], threshold = 10) {
  const matches = findSimilar(description, history);
  if (!matches.length || !(price > 0)) return null;
  const withDiff = matches.map((m) => ({ ...m, diffPct: ((price - m.unit_price) / m.unit_price) * 100 }));
  const last = withDiff[0];
  const avg = withDiff.reduce((s, m) => s + m.unit_price, 0) / withDiff.length;
  const avgDiff = ((price - avg) / avg) * 100;
  const alert = Math.abs(last.diffPct) >= threshold || Math.abs(avgDiff) >= threshold;
  return { matches: withDiff, last, avg, avgDiff, alert };
}
