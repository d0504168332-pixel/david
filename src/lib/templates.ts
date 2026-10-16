// תבניות מובנות לחברות הסעות (מופיעות בנוסף לתבניות שהעסק שמר)
import type { QuoteItem, QuoteMeta } from "./types";

export type TemplateLike = {
  id: string;
  name: string;
  title: string | null;
  items: QuoteItem[];
  notes: string | null;
  terms: string | null;
  meta: QuoteMeta;
  builtin?: boolean;
};

const it = (description: string, details = "", quantity = 1): QuoteItem => ({
  id: Math.random().toString(36).slice(2, 10),
  description,
  details,
  quantity,
  unit_price: 0,
});

export const TRANSPORT_TEMPLATES: TemplateLike[] = [
  {
    id: "builtin-annual-trip",
    builtin: true,
    name: "טיול שנתי",
    title: "הסעות לטיול שנתי",
    items: [it("הסעה הלוך-חזור לטיול", "כולל המתנה ביעד לאורך היום"), it("מלווה / מאבטח", "לפי דרישת משרד החינוך")],
    notes: "האוטובוסים ממוזגים, עם חגורות בטיחות בכל המושבים.",
    terms: "המחיר כולל נסיעה, המתנה ונהג.\nשינוי מסלול ביום הטיול יחויב לפי ק״מ בפועל.\nביטול עד 72 שעות לפני הנסיעה ללא עלות.",
    meta: { trip: { round_trip: true, time: "08:00", return_time: "16:00" } },
  },
  {
    id: "builtin-employees",
    builtin: true,
    name: "הסעת עובדים",
    title: "הסעות עובדים קבועות",
    items: [it("הסעת עובדים – בוקר"), it("הסעת עובדים – ערב")],
    notes: "מסלול ותחנות איסוף לפי רשימה שתישלח מראש.",
    terms: "חיוב חודשי לפי מספר ימי העבודה בפועל.\nתנאי תשלום: שוטף + 30.",
    meta: { trip: { round_trip: false, time: "07:00" } },
  },
  {
    id: "builtin-event",
    builtin: true,
    name: "אירוע",
    title: "הסעות לאירוע",
    items: [it("הסעה הלוך-חזור לאירוע", "כולל המתנה עד סיום האירוע")],
    notes: "נקודות איסוף ופיזור יתואמו מול איש הקשר.",
    terms: "הארכת המתנה מעבר לשעה שנקבעה תחויב לפי שעה.\nביטול עד 48 שעות לפני האירוע ללא עלות.",
    meta: { trip: { round_trip: true, time: "18:00", return_time: "23:30" } },
  },
];
