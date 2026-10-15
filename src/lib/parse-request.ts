// פענוח בקשה להצעת מחיר מתוך טקסט של מייל — ללא AI (גיבוי כשאין מפתח API)

export type ParsedRequest = {
  client_name: string;
  client_contact: string;
  client_phone: string;
  client_email: string;
  client_address: string;
  title: string;
  items: { description: string; details?: string; quantity: number }[];
  /** מידע פנימי מהמייל (מועדים, תקציב) — לא נכנס להצעה */
  hints: string;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?972[-\s]?|0)(?:[23489]|5\d|7\d)[-\s]?\d{3}[-\s]?\d{4}/;
const SIGN_OFF = /^(?:בברכה|ב?תודה(?: מראש)?|תודה רבה|בהוקרה|כל טוב|שלך|שלכם|regards|best|thanks|thank you|cheers)[,.!\s]*$/i;
const UNITS = "יח(?:ידות|׳|')?|יחידה|פריטים|חדרים|שעות|ימים|עמודים|מטר(?:ים)?|מ\"ר|מ״ר|קומות|אנשים|משתתפים|מנות|זוגות|סטים|עותקים|copies|pcs|units|hours|days";

function clean(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function parseQty(line: string): { qty: number; text: string } {
  // "500 כרטיסי ביקור" — מספר בתחילת השורה
  const lead = line.match(/^(\d{1,6})\s+(?![x×*]|מטר|ס"מ|ס״מ|מ"ר|מ״ר|cm|m\b)(.+)/i);
  if (lead && Number(lead[1]) > 1) return { qty: Number(lead[1]), text: lead[2].trim() };
  const dims = /\d\s*[x×*]\s*\d/.test(line);
  const pats = [
    new RegExp(`(?:כמות|qty|quantity)\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)`, "i"),
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${UNITS})\\b`, "i"),
    ...(dims ? [] : [/[x×*]\s*(\d+(?:\.\d+)?)\b/i, /\b(\d+(?:\.\d+)?)\s*[x×]/i]),
  ];
  for (const re of pats) {
    const m = line.match(re);
    if (m) {
      const qty = Number(m[1]);
      if (qty > 0 && qty < 100000) {
        let text = line.replace(/(?:כמות|qty|quantity)\s*[:\-]?\s*\d+(?:\.\d+)?/i, "");
        if (!dims) text = text.replace(/\s*[x×*]\s*\d+(?:\.\d+)?\b/i, "").replace(/\b\d+(?:\.\d+)?\s*[x×]\s*/i, "");
        text = clean(text);
        return { qty, text: text.replace(/[,:\-–]+$/, "").trim() || line };
      }
    }
  }
  return { qty: 1, text: line };
}

export function parseRequestHeuristic(raw: string): ParsedRequest {
  const text = raw.replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trim());

  // התעלמות משרשור קודם (תשובות מצוטטות)
  const cut = lines.findIndex((l) => /^(?:-{2,}|_{3,}|On .* wrote:|ב.*כתב\/ה:|From:|מאת:)/i.test(l) && lines.indexOf(l) > 3);
  const body = cut > 0 ? lines.slice(0, cut) : lines;

  const out: ParsedRequest = {
    client_name: "",
    client_contact: "",
    client_phone: "",
    client_email: "",
    client_address: "",
    title: "",
    items: [],
    hints: "",
  };

  // מייל וטלפון — מהכותרת "From" או מהגוף
  const fromLine = lines.find((l) => /^(?:from|מאת)\s*:/i.test(l));
  const email = (fromLine && fromLine.match(EMAIL_RE)?.[0]) || text.match(EMAIL_RE)?.[0] || "";
  out.client_email = email;
  out.client_phone = (text.match(PHONE_RE)?.[0] ?? "").replace(/\s/g, "-");
  if (fromLine) {
    const nm = fromLine.replace(/^(?:from|מאת)\s*:\s*/i, "").replace(/<[^>]*>/, "").replace(EMAIL_RE, "").replace(/["']/g, "").trim();
    if (nm && nm.length < 40) out.client_contact = nm;
  }

  // נושא
  const subj = lines.find((l) => /^(?:subject|נושא)\s*:/i.test(l));
  if (subj)
    out.title = clean(
      subj
        .replace(/^(?:subject|נושא)\s*:\s*/i, "")
        .replace(/^(?:re|fw|fwd)\s*:\s*/i, "")
        .replace(/^(?:בקשה ל)?הצעת מחיר\s*(?:עבור|ל|-|–|:)?\s*/, "")
        .replace(/^[-–:]\s*/, "")
    );

  // שם — אחרי ברכת סיום, או "שמי X" / "מדבר/ת X"
  const signIdx = body.findIndex((l) => SIGN_OFF.test(l));
  if (signIdx >= 0) {
    const after = body.slice(signIdx + 1).filter(Boolean);
    if (after[0] && after[0].length < 40 && !EMAIL_RE.test(after[0]) && !PHONE_RE.test(after[0])) out.client_contact ||= clean(after[0]);
    const comp = after.slice(1, 4).find((l) => l.length < 50 && !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !/^(?:טל|נייד|פקס|tel|mobile|phone|www)/i.test(l));
    if (comp) out.client_name = clean(comp);
  }
  const intro = text.match(/(?:שמי|קוראים לי|מדבר(?:ת)?|my name is)\s+([^\n,.]{2,30})/i);
  if (intro) out.client_contact ||= clean(intro[1]);

  // חברה
  const company =
    text.match(/(?:מחברת|חברת|מטעם|ממשרד|מעסק)\s+([^\n,.]{2,40})/)?.[1] ||
    lines.find((l) => /בע["״]?מ|ltd|inc\b/i.test(l) && l.length < 50);
  if (company) out.client_name = clean(company);
  if (!out.client_name && email) {
    const domain = email.split("@")[1].split(".")[0];
    if (!/^(?:gmail|walla|hotmail|outlook|yahoo|icloud|live|012|013|netvision|bezeqint)$/i.test(domain)) out.client_name = domain;
  }
  if (!out.client_name) out.client_name = out.client_contact;

  // כתובת
  const addr = text.match(/(?:כתובת|באזור|ב(?:עיר)?|address)\s*:\s*([^\n]{3,60})/i);
  if (addr) out.client_address = clean(addr[1]);

  // פריטים — שורות ממוספרות / תבליטים
  const bullet = /^(?:[-•*●▪◦–]|\d{1,2}[.)]|[א-ת][.)])\s+(.+)/;
  for (const l of body) {
    const m = l.match(bullet);
    if (m && m[1].length > 1) {
      const { qty, text: t } = parseQty(m[1]);
      out.items.push({ description: clean(t), quantity: qty });
    }
  }

  // אין תבליטים — מחפשים את המשפט של הבקשה
  if (out.items.length === 0) {
    const req = text.match(/(?:הצעת מחיר|הצעה)\s+(?:עבור|ל|על|לגבי)\s*([^\n.?!]{3,120})/) ||
      text.match(/(?:מבקש(?:ת|ים)?|מעוניינ(?:ת|ים)?|צריכ(?:ה|ים)?|צריך|מחפש(?:ת|ים)?|נשמח ל)\s+(?:לקבל\s+)?(?:הצעת מחיר\s+)?(?:עבור|ל|ב)?\s*([^\n.?!]{3,120})/);
    if (req) {
      req[1]
        .split(/\s*(?:,|\sו(?=[א-ת]{3,})|\+)\s*/)
        .map((p) => p.trim())
        .filter((p) => p.length > 2)
        .forEach((p) => {
          // "כולל 6 עמודים" — פירוט של הפריט הקודם
          if (/^(?:כולל|כוללת|עם|including|with)\s/i.test(p) && out.items.length) {
            const prev = out.items[out.items.length - 1];
            prev.details = [prev.details, p].filter(Boolean).join(", ");
            return;
          }
          const { qty, text: t } = parseQty(p);
          out.items.push({ description: clean(t), quantity: qty });
        });
    }
  }

  if (!out.title) out.title = out.items[0]?.description ?? "";

  // תאריכים / דדליין / תקציב — להערות
  const extras = body.filter((l) => /(?:תאריך|עד ה|דדליין|deadline|תקציב|budget|מועד|בתאריך|\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/i.test(l) && l.length < 160);
  if (extras.length) out.hints = extras.slice(0, 4).map(clean).join("\n");

  return out;
}
