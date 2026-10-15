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

  // אין תבליטים — מחלצים בקשות מתוך טקסט חופשי
  if (out.items.length === 0) {
    const sigStart = signIdx >= 0 ? signIdx : body.length;
    const free = body
      .slice(0, sigStart)
      .filter((l) => l && !/^(?:from|מאת|to|אל|subject|נושא|date|תאריך שליחה|sent)\s*:/i.test(l))
      .filter((l) => !EMAIL_RE.test(l) && !(PHONE_RE.test(l) && l.length < 30))
      .join("\n");
    out.items = extractFreeItems(free);
  }

  if (!out.title) out.title = out.items[0]?.description ?? "";

  // תאריכים / דדליין / תקציב — להערות
  const extras = body.filter((l) => /(?:תאריך|עד ה|דדליין|deadline|תקציב|budget|מועד|בתאריך|\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/i.test(l) && l.length < 160);
  if (extras.length) out.hints = extras.slice(0, 4).map(clean).join("\n");

  return out;
}

// ---------- חילוץ פריטים מטקסט חופשי ----------

const NUM_WORDS: Record<string, number> = {
  אחד: 1, אחת: 1, שניים: 2, שתיים: 2, שני: 2, שתי: 2, זוג: 2, שלוש: 3, שלושה: 3, ארבע: 4, ארבעה: 4,
  חמש: 5, חמישה: 5, שש: 6, שישה: 6, שבע: 7, שבעה: 7, שמונה: 8, תשע: 9, תשעה: 9, עשר: 10, עשרה: 10,
  "אחד עשר": 11, "שתים עשרה": 12, תריסר: 12, עשרים: 20, שלושים: 30, ארבעים: 40, חמישים: 50, מאה: 100, מאתיים: 200, אלף: 1000,
};
const NUM_WORD_RE = Object.keys(NUM_WORDS).sort((a, b) => b.length - a.length).join("|");

// פתיחים שאינם חלק מהפריט עצמו
const LEAD_IN = new RegExp(
  "^(?:(?:ו?גם|בנוסף|וכן|ו?עוד|כמו כן)\\s+)?" +
    "(?:(?:ה?לקוח(?:ה)?|אנחנו|אני|אנו|הם|היא|הוא)\\s+)?" +
    "(?:(?:רוצ(?:ה|ים|ות)|צריכ(?:ה|ים|ות)?|צריך|מבקש(?:ת|ים)?|מעוניינ(?:ת|ים)?|מחפש(?:ת|ים)?|מעניין\\s+אותנו|נשמח|אשמח|נרצה|ארצה|להזמין|מזמינ(?:ה|ים)?|מתעניינ(?:ת|ים)?|אפשר|אפשרי|ניתן|we\\s+need|we\\s+want|i\\s+need|looking\\s+for)(?:\\s+|$))*" +
    "(?:(?:לקבל|להזמין|לרכוש|לבצע|לעשות)\\s+)?" +
    "(?:(?:ל|ב)?הצע(?:ה|ת\\s+מחיר|ות\\s+מחיר)(?:\\s+|$))?" +
    "(?:(?:עבור|על|לגבי|ל|ב)\\s+)?",
  "i"
);
const REQUEST_HINT = /(?:רוצ|צריכ|צריך|מבקש|מעוניינ|מחפש|נשמח|אשמח|נרצה|להזמין|מזמינ|הצעת מחיר|הצעה|מתעניינ|need|want|looking for|quote)/i;
const NOISE = /^(?:שלום(?: רב)?|היי+|הי|בוקר טוב|ערב טוב|צהריים טובים|אהלן|hello|hi|hey|dear|תודה(?: רבה| מראש)?|בברכה|נשמח לשמוע|נשמח לתשובה|מחכה לתשובה|אשמח לתשובה|אשמח לשמוע|thanks|thank you)(?:[\s,!.]|$)/i;
// מילים שמתארות היקף/מידה של הפריט הקודם ולא פריט חדש
const MEASURE = /^(?:חדרים|עמדות(?: עבודה)?|אנשים|משתתפים|מוזמנים|אורחים|קומות|מ["״]ר|מטר(?:ים)?(?: רבוע(?:ים)?)?|דירות|עובדים|תלמידים|ילדים|rooms|people|guests|sqm)(?:\s|$)/i;

function stripLead(p: string) {
  let t = p.trim();
  for (let i = 0; i < 3; i++) {
    const n = t.replace(LEAD_IN, "").replace(/^ל(?=[א-ת]{4,})/, "").trim();
    if (n === t) break;
    t = n;
  }
  return t.replace(/^[-–:,]\s*/, "").replace(/\s*(?:בבקשה|בערך|לפחות|please)\s*$/i, "").trim();
}

export function extractFreeItems(text: string): { description: string; details?: string; quantity: number }[] {
  const items: { description: string; details?: string; quantity: number }[] = [];
  const splitter = new RegExp(
    "[\\n.;!?]+|,\\s*|\\s+ו-?(?=\\d|(?:" + NUM_WORD_RE + ")\\s)|\\s+(?:וגם|וכן|בנוסף)\\s+|\\s\\+\\s"
  );
  const parts = text.replace(/הצעת מחיר\s*:/g, "\n").split(splitter).map((x) => (x ?? "").trim()).filter(Boolean);
  const qtyRe = new RegExp("(?:^|\\s)([בלו])?-?(\\d{1,6}(?:\\.\\d+)?|" + NUM_WORD_RE + ")\\s+(?![x×*]\\s*\\d)([^\\d].{1,70})$");

  let sawRequest = false;
  for (const raw of parts) {
    const p = raw.replace(/\s+/g, " ");
    if (NOISE.test(p) || p.length < 3) continue;
    if (REQUEST_HINT.test(p)) sawRequest = true;

    // "כולל 6 עמודים" — פירוט של הפריט הקודם
    if (/^(?:כולל|כוללת|עם|including|with)\s/i.test(p) && items.length) {
      const prev = items[items.length - 1];
      prev.details = [prev.details, p].filter(Boolean).join(", ");
      continue;
    }

    const body = stripLead(p);
    if (!body || REQUEST_HINT.test(body) && body.split(" ").length <= 2) continue;
    const m = body.match(qtyRe);
    if (m) {
      const prefix = m[1];
      const n = /^\d/.test(m[2]) ? Number(m[2]) : NUM_WORDS[m[2]];
      const before = stripLead(body.slice(0, m.index ?? 0).trim());
      let desc = m[3].trim();
      // "הסעה ל-50 אנשים" / "צביעת דירה 4 חדרים" — המספר מתאר את הפריט, לא כמות
      if (before && !REQUEST_HINT.test(before) && (prefix === "ל" || MEASURE.test(desc))) {
        items.push({ description: before.replace(/[-–:,]\s*$/, "").trim(), details: `${n} ${desc}`.replace(/[,:\-–]+$/, ""), quantity: 1 });
        continue;
      }
      // "כרטיסי ביקור 10" / "אימון כושר - 10 מפגשים"
      if (before && before.split(" ").length <= 5 && /^(?:מפגשים|פגישות|שיעורים|אימונים|יחידות|יח׳|יח'|פעמים|חודשים|שעות|ימים)(?:\s|$)/.test(desc))
        desc = `${before.replace(/[-–:]\s*$/, "").trim()} (${desc})`;
      else if (before && !REQUEST_HINT.test(before) && before.split(" ").length <= 4) desc = `${before} ${desc}`;
      if (n > 0 && desc.length > 1) {
        desc = desc.replace(/[,:\-–]+$/, "").trim();
        // "5 חדרים" אחרי "הדברה בבית" — פירוט של הפריט הקודם
        if (MEASURE.test(desc) && items.length) {
          const prev = items[items.length - 1];
          prev.details = [prev.details, `${n} ${desc}`].filter(Boolean).join(", ");
          continue;
        }
        // "2 כובעים ומדבקות לרכב" → שני פריטים
        const sp = desc.match(/^(.{2,30}?)\s+(?:ו(?=[א-ת]{3,})|and\s+(?:a\s+|an\s+)?)(.{3,})$/i);
        if (sp && sp[1].split(" ").length <= 3 && !/^(?:עם|של)\s/.test(sp[2])) {
          items.push({ description: sp[1].trim(), quantity: n });
          items.push({ description: sp[2].trim(), quantity: 1 });
        } else items.push({ description: desc, quantity: n });
        continue;
      }
    }

    // ללא מספר — רק אם זה נשמע כמו בקשה
    if (REQUEST_HINT.test(p) || (sawRequest && body.split(" ").length <= 8 && /[א-תa-z]/i.test(body))) {
      const { qty, text: t } = parseQty(body);
      const d = t.replace(/[,:\-–]+$/, "").trim();
      if (d.length > 2 && !/^(?:הצעת מחיר|הצעה|מחיר)$/.test(d) && d.split(" ").length <= 14) items.push({ description: d, quantity: qty });
    }
  }
  return items;
}
