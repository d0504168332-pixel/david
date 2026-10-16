"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Business, Profile } from "@/lib/types";
import { calcTotals, formatDate, hasOptions, money, quoteNumber, tripDates, type QuoteForDoc } from "@/lib/quote";
import type { QuoteItem } from "@/lib/types";
import Stamp from "./Stamp";
import Signature from "./Signature";

export type DocBusiness = Pick<
  Business,
  | "name"
  | "logo_url"
  | "address"
  | "phone"
  | "email"
  | "website"
  | "tax_id"
  | "primary_color"
  | "accent_color"
  | "template"
  | "quote_prefix"
  | "show_tax_id"
  | "show_website"
>;

export type DocAuthor = Pick<
  Profile,
  | "full_name"
  | "job_title"
  | "phone"
  | "email"
  | "signature_style"
  | "signature_image"
  | "signature_color"
  | "stamp_color"
  | "stamp_shape"
  | "show_signature"
  | "show_stamp"
>;

type Props = {
  business: DocBusiness;
  author: DocAuthor | null;
  quote: QuoteForDoc;
  id?: string;
};

export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function Logo({ url, name, size = 64, light = false, bg = "#1f3a5f" }: { url: string | null; name: string; size?: number; light?: boolean; bg?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} crossOrigin="anonymous" style={{ maxHeight: size, maxWidth: size * 2.6, objectFit: "contain" }} />;
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: size / 2.6,
        background: light ? "rgba(255,255,255,.16)" : bg,
        color: "#fff",
        border: light ? "1.5px solid rgba(255,255,255,.5)" : "none",
      }}
    >
      <span style={{ color: "#fff" }}>{initials}</span>
    </div>
  );
}

export default function QuoteDocument({ business, author, quote, id }: Props) {
  const t = business.template || "modern";
  const primary = business.primary_color || "#1f3a5f";
  const accent = business.accent_color || "#c8a35a";
  const totals = calcTotals(quote);
  const multi = hasOptions(quote.meta);
  const opts = multi ? quote.meta!.options! : [];
  const optIds = opts.map((o) => o.id);
  const chosen = multi && quote.meta?.chosen_option && optIds.includes(quote.meta.chosen_option) ? quote.meta.chosen_option : null;
  const common = multi ? quote.items.filter((it) => !it.option || !optIds.includes(it.option)) : quote.items;
  const dates = tripDates(quote.meta?.trip);
  const isClassic = t === "classic";
  const baseFont = isClassic ? "var(--font-frank), var(--font-heebo), serif" : "var(--font-heebo), sans-serif";
  const num = quoteNumber(business.quote_prefix, quote.number);

  const contactLine = [
    business.address,
    business.phone && `טל׳ ${business.phone}`,
    business.email,
    business.show_website && business.website,
  ].filter(Boolean) as string[];

  const page: CSSProperties = {
    width: A4_WIDTH,
    minHeight: A4_HEIGHT,
    background: "#fff",
    color: "#1c1917",
    fontFamily: baseFont,
    direction: "rtl",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    fontSize: 13.5,
    lineHeight: 1.55,
    overflow: "hidden",
  };

  // ---------- כותרות לפי תבנית ----------
  let header: ReactNode;
  const metaItems: [string, string][] = [
    ["מספר הצעה", num],
    ["תאריך", formatDate(quote.issue_date)],
    ...(quote.valid_until ? ([["בתוקף עד", formatDate(quote.valid_until)]] as [string, string][]) : []),
  ];

  if (t === "modern") {
    header = (
      <div style={{ background: primary, color: "#fff", padding: "38px 56px 30px", position: "relative" }}>
        <div style={{ position: "absolute", insetInlineStart: 0, bottom: 0, height: 5, width: "100%", background: accent }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {business.logo_url ? (
              <div style={{ background: "#fff", borderRadius: 14, padding: 8, display: "grid", placeItems: "center" }}>
                <Logo url={business.logo_url} name={business.name} size={58} />
              </div>
            ) : (
              <Logo url={null} name={business.name} size={62} light />
            )}
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.3 }}>{business.name}</div>
              {business.show_tax_id && business.tax_id ? (
                <div style={{ fontSize: 12.5, opacity: 0.8 }}>ח.פ. / ע.מ. {business.tax_id}</div>
              ) : null}
            </div>
          </div>
          <div style={{ textAlign: "end" }}>
            <div style={{ fontSize: 34, fontWeight: 300, letterSpacing: 1, lineHeight: 1 }}>הצעת מחיר</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginTop: 6 }}>{num}</div>
          </div>
        </div>
      </div>
    );
  } else if (t === "classic") {
    header = (
      <div style={{ padding: "34px 56px 6px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: primary }}>
          <Logo url={business.logo_url} name={business.name} size={60} bg={primary} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: primary }}>{business.name}</div>
        {business.show_tax_id && business.tax_id ? (
          <div style={{ fontSize: 12.5, color: "#57534e" }}>ח.פ. / ע.מ. {business.tax_id}</div>
        ) : null}
        <div style={{ marginTop: 16, borderTop: `2px solid ${primary}`, borderBottom: `1px solid ${primary}`, height: 4 }} />
        <div style={{ fontSize: 13, color: "#57534e", marginTop: 8 }}>{contactLine.join("  ·  ")}</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 14, letterSpacing: 2, color: "#1c1917" }}>הצעת מחיר</div>
        <div style={{ width: 60, height: 2, background: accent, margin: "8px auto 0" }} />
      </div>
    );
  } else if (t === "minimal") {
    header = (
      <div style={{ padding: "52px 56px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ color: primary }}>
            <Logo url={business.logo_url} name={business.name} size={54} bg={primary} />
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 10, color: "#1c1917" }}>{business.name}</div>
            <div style={{ fontSize: 12, color: "#78716c", maxWidth: 300 }}>{contactLine.join(" · ")}</div>
          </div>
          <div style={{ textAlign: "end" }}>
            <div style={{ fontSize: 40, fontWeight: 200, letterSpacing: -1, lineHeight: 1, color: "#1c1917" }}>הצעת מחיר</div>
            <div style={{ fontSize: 13, color: primary, fontWeight: 600, marginTop: 8 }}>{num}</div>
          </div>
        </div>
        <div style={{ height: 1, background: "#e7e5e4", marginTop: 28 }} />
      </div>
    );
  } else {
    // bold
    header = (
      <div style={{ padding: "0 56px 0 0", display: "flex", alignItems: "stretch" }}>
        <div style={{ flex: 1, padding: "44px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: primary }}>
            <Logo url={business.logo_url} name={business.name} size={60} bg={primary} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1c1917" }}>{business.name}</div>
              <div style={{ fontSize: 12, color: "#78716c" }}>{contactLine.slice(0, 2).join(" · ")}</div>
            </div>
          </div>
        </div>
        <div
          style={{
            background: primary,
            color: "#fff",
            padding: "44px 40px 24px",
            borderEndStartRadius: 36,
            minWidth: 250,
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: 3, color: accent, fontWeight: 700 }}>QUOTATION</div>
          <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1 }}>הצעת מחיר</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6, opacity: 0.9 }}>{num}</div>
        </div>
      </div>
    );
  }

  const sectionPad = "0 56px";
  const tableHeadStyle: CSSProperties =
    t === "modern" || t === "bold"
      ? { background: primary, color: "#fff" }
      : t === "classic"
        ? { background: hexToRgba(primary, 0.07), color: primary, borderTop: `1.5px solid ${primary}`, borderBottom: `1.5px solid ${primary}` }
        : { color: "#78716c", borderBottom: "1px solid #d6d3d1" };

  return (
    <div id={id} style={page} className="quote-doc">
      {header}

      {/* פרטי לקוח + מטא */}
      <div style={{ padding: sectionPad, marginTop: 28, display: "flex", gap: 24, justifyContent: "space-between" }}>
        <div
          style={{
            flex: 1,
            borderRadius: t === "classic" ? 0 : 14,
            padding: "14px 18px",
            background: t === "minimal" ? "transparent" : hexToRgba(primary, 0.045),
            borderInlineStart: t === "minimal" ? `3px solid ${primary}` : `4px solid ${accent}`,
          }}
        >
          <div style={{ fontSize: 11.5, color: "#78716c", fontWeight: 600, letterSpacing: 0.5 }}>לכבוד</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{quote.client_name || "שם הלקוח"}</div>
          {quote.client_contact ? <div>לידי: {quote.client_contact}</div> : null}
          <div style={{ color: "#57534e", fontSize: 12.5 }}>
            {[quote.client_address, quote.client_phone, quote.client_email, quote.client_tax_id && `ח.פ. ${quote.client_tax_id}`]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div style={{ minWidth: 190, display: "grid", gap: 6, alignContent: "start" }}>
          {metaItems.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px dashed #e7e5e4", paddingBottom: 4 }}>
              <span style={{ color: "#78716c", fontSize: 12.5 }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {quote.meta?.trip && (quote.meta.trip.origin || quote.meta.trip.destination) ? (
        <div style={{ padding: sectionPad, marginTop: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              border: `1px solid ${hexToRgba(primary, 0.18)}`,
              borderRadius: t === "classic" ? 0 : 12,
              overflow: "hidden",
            }}
          >
            {(
              [
                ["מסלול", `${quote.meta.trip.origin ?? ""} ← ${quote.meta.trip.destination ?? ""}`, 2],
                [
                  dates.length > 1 ? `${dates.length} תאריכים` : "תאריך ושעה",
                  dates.length > 1
                    ? [dates.map((d) => formatDate(d).slice(0, 5)).join(", "), quote.meta.trip.time].filter(Boolean).join(" · ")
                    : [quote.meta.trip.date && formatDate(quote.meta.trip.date), quote.meta.trip.time].filter(Boolean).join(" · ") || "—",
                  1,
                ],
                ["נוסעים", quote.meta.trip.passengers ? String(quote.meta.trip.passengers) : "—", 1],
                ["סוג נסיעה", quote.meta.trip.round_trip ? `הלוך-חזור${quote.meta.trip.return_time ? ` (חזור ${quote.meta.trip.return_time})` : ""}` : "כיוון אחד", 2],
                ["עצירות", quote.meta.trip.stops || "—", 2],
              ] as [string, string, number][]
            ).map(([k, v, span], i) => (
              <div key={k} style={{ gridColumn: `span ${span}`, padding: "9px 14px", background: i === 0 ? hexToRgba(primary, 0.06) : "transparent", borderTop: i > 2 ? `1px solid ${hexToRgba(primary, 0.12)}` : undefined, borderInlineStart: i === 1 || i === 2 || i === 4 ? `1px solid ${hexToRgba(primary, 0.12)}` : undefined }}>
                <div style={{ fontSize: 11, color: "#78716c", fontWeight: 600 }}>{k}</div>
                <div style={{ fontWeight: 700, fontSize: i === 0 ? 14.5 : 13.5 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {quote.title ? (
        <div style={{ padding: sectionPad, marginTop: 22, fontSize: 15.5 }}>
          <span style={{ fontWeight: 800 }}>הנדון: </span>
          <span style={{ fontWeight: 600, textDecoration: "underline", textDecorationColor: accent, textUnderlineOffset: 5 }}>{quote.title}</span>
        </div>
      ) : null}

      {/* טבלת פריטים */}
      <div style={{ padding: sectionPad, marginTop: 20 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={tableHeadStyle}>
              {["#", "תיאור", "כמות", "מחיר ליחידה", "סה״כ"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    fontWeight: 700,
                    textAlign: i <= 1 ? "start" : "center",
                    width: i === 0 ? 36 : i === 1 ? undefined : i === 2 ? 64 : 112,
                    borderStartStartRadius: (t === "modern" || t === "bold") && i === 0 ? 10 : 0,
                    borderEndStartRadius: (t === "modern" || t === "bold") && i === 0 ? 10 : 0,
                    borderStartEndRadius: (t === "modern" || t === "bold") && i === 4 ? 10 : 0,
                    borderEndEndRadius: (t === "modern" || t === "bold") && i === 4 ? 10 : 0,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {common.map((it, idx) => (
              <ItemRow key={it.id ?? idx} it={it} n={idx + 1} zebra={t !== "minimal" && idx % 2 === 1} primary={primary} />
            ))}
            {opts.map((o, oi) => {
              const its = quote.items.filter((it) => it.option === o.id);
              const ot = calcTotals(quote, o.id);
              const dim = chosen && chosen !== o.id;
              const on = chosen === o.id;
              return [
                <tr key={`h-${o.id}`} style={{ opacity: dim ? 0.45 : 1 }}>
                  <td colSpan={5} style={{ padding: "12px 12px 6px", borderBottom: `2px solid ${on ? "#059669" : accent}` }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: on ? "#047857" : primary }}>
                      {on ? "✓ " : ""}אפשרות {["א׳", "ב׳", "ג׳", "ד׳"][oi] ?? oi + 1}: {o.label}
                    </span>
                    {on ? <span style={{ fontSize: 12, color: "#047857", fontWeight: 700 }}> · האפשרות שנבחרה</span> : null}
                  </td>
                </tr>,
                ...its.map((it, k) => (
                  <ItemRow key={it.id ?? `${o.id}-${k}`} it={it} n={common.length + k + 1} zebra={false} primary={primary} dim={!!dim} />
                )),
                <tr key={`t-${o.id}`} style={{ opacity: dim ? 0.45 : 1 }}>
                  <td colSpan={4} style={{ padding: "8px 12px", textAlign: "end", fontWeight: 700, color: "#57534e" }}>
                    סה״כ לאפשרות {["א׳", "ב׳", "ג׳", "ד׳"][oi] ?? oi + 1}
                    {quote.vat_enabled ? " כולל מע״מ" : ""}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 900, whiteSpace: "nowrap", color: on ? "#047857" : primary }}>{money(ot.total)}</td>
                </tr>,
              ];
            })}
            {quote.items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 22, textAlign: "center", color: "#a8a29e" }}>
                  עדיין לא נוספו פריטים
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* סיכומים */}
      {multi && !chosen ? (
        <div style={{ padding: sectionPad, marginTop: 14 }}>
          <div style={{ background: hexToRgba(primary, 0.05), borderRadius: t === "classic" ? 0 : 12, padding: "10px 16px", fontWeight: 600, color: "#44403c" }}>
            ההצעה כוללת {opts.length} אפשרויות. בעת אישור ההצעה בוחרים אפשרות אחת.
          </div>
        </div>
      ) : (
      <div style={{ padding: sectionPad, marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 300, display: "grid", gap: 6 }}>
          <Row label="סכום ביניים" value={money(totals.subtotal)} />
          {totals.discount > 0 ? (
            <Row
              label={`הנחה${quote.discount_type === "percent" ? ` (${quote.discount_value}%)` : ""}`}
              value={`- ${money(totals.discount)}`}
              valueColor="#b91c1c"
            />
          ) : null}
          {totals.discount > 0 ? <Row label="אחרי הנחה" value={money(totals.afterDiscount)} /> : null}
          {quote.vat_enabled ? <Row label={`מע״מ ${quote.vat_rate}%`} value={money(totals.vat)} /> : null}
          <div
            style={{
              marginTop: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: t === "classic" ? 0 : 12,
              background: t === "minimal" ? "transparent" : primary,
              color: t === "minimal" ? "#1c1917" : "#fff",
              borderTop: t === "minimal" ? "2px solid #1c1917" : undefined,
            }}
          >
            <span style={{ fontWeight: 700 }}>{quote.vat_enabled ? "סה״כ לתשלום כולל מע״מ" : "סה״כ לתשלום"}</span>
            <span style={{ fontWeight: 900, fontSize: 19 }}>{money(totals.total)}</span>
          </div>
        </div>
      </div>
      )}

      {/* הערות ותנאים */}
      {quote.notes || quote.terms ? (
        <div style={{ padding: sectionPad, marginTop: 26, display: "grid", gridTemplateColumns: quote.notes && quote.terms ? "1fr 1fr" : "1fr", gap: 20 }}>
          {quote.notes ? <TextBlock title="הערות" text={quote.notes} color={primary} /> : null}
          {quote.terms ? <TextBlock title="תנאים" text={quote.terms} color={primary} /> : null}
        </div>
      ) : null}

      <div style={{ flex: 1 }} />

      {/* חתימה וחותמת */}
      <div style={{ padding: sectionPad, marginTop: 30, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
        <div>
          <div style={{ color: "#78716c" }}>בברכה,</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{author?.full_name || business.name}</div>
          {author?.job_title ? <div style={{ color: "#57534e" }}>{author.job_title}</div> : null}
          <div style={{ color: "#57534e", fontSize: 12.5 }}>{[author?.phone, author?.email].filter(Boolean).join(" · ")}</div>
        </div>
        {author && (author.show_signature || author.show_stamp) ? (
          // חותמת למעלה, חתימת יד מתחתיה
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 170 }}>
            {author.show_stamp ? (
              <div style={{ marginBottom: author.show_signature ? (author.stamp_shape === "round" || author.stamp_shape === "rect" ? -16 : -6) : 0 }}>
                <Stamp
                  businessName={business.name}
                  fullName={author.full_name}
                  jobTitle={author.job_title}
                  taxId={business.show_tax_id ? business.tax_id : null}
                  color={author.stamp_color}
                  shape={author.stamp_shape}
                  size={author.stamp_shape === "round" ? 112 : author.stamp_shape === "rect" ? 100 : 140}
                />
              </div>
            ) : null}
            {author.show_signature ? (
              <div style={{ textAlign: "center", position: "relative" }}>
                <Signature name={author.full_name} style={author.signature_style} color={author.signature_color} image={author.signature_image} height={62} />
                <div style={{ borderTop: "1px solid #a8a29e", fontSize: 11, color: "#78716c", paddingTop: 2, marginTop: 2 }}>חתימה</div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {quote.status === "approved" && quote.approved_by_name ? (
        <div style={{ padding: sectionPad, marginTop: 14 }}>
          <div style={{ border: "2px solid #059669", color: "#047857", borderRadius: 12, padding: "10px 16px", display: "inline-block", fontWeight: 700 }}>
            ✓ ההצעה אושרה ע״י {quote.approved_by_name}
            {quote.approved_at ? ` בתאריך ${formatDate(quote.approved_at)}` : ""}
          </div>
        </div>
      ) : null}

      {/* תחתית */}
      <div style={{ marginTop: 26 }}>
        {t !== "classic" ? (
          <div style={{ padding: "12px 56px", fontSize: 11.5, color: t === "minimal" ? "#78716c" : "#fff", background: t === "minimal" ? "transparent" : primary, borderTop: t === "minimal" ? "1px solid #e7e5e4" : undefined, display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>{contactLine.join("  |  ")}</span>
            <span style={{ opacity: 0.8 }}>{num}</span>
          </div>
        ) : (
          <div style={{ padding: "0 56px 26px" }}>
            <div style={{ borderTop: `1px solid ${primary}`, borderBottom: `2px solid ${primary}`, height: 4 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function ItemRow({ it, n, zebra, primary, dim }: { it: QuoteItem; n: number; zebra: boolean; primary: string; dim?: boolean }) {
  const cell: CSSProperties = { padding: "11px 12px", borderBottom: "1px solid #f0efed", verticalAlign: "top" };
  return (
    <tr style={{ background: zebra ? hexToRgba(primary, 0.03) : "transparent", opacity: dim ? 0.45 : 1 }}>
      <td style={{ ...cell, color: "#a8a29e" }}>{n}</td>
      <td style={{ ...cell, verticalAlign: undefined }}>
        <div style={{ fontWeight: 600 }}>{it.description || "—"}</div>
        {it.details ? <div style={{ color: "#78716c", fontSize: 12, whiteSpace: "pre-wrap" }}>{it.details}</div> : null}
      </td>
      <td style={{ ...cell, textAlign: "center" }}>{it.quantity}</td>
      <td style={{ ...cell, textAlign: "center", whiteSpace: "nowrap" }}>{money(it.unit_price)}</td>
      <td style={{ ...cell, textAlign: "center", fontWeight: 700, whiteSpace: "nowrap" }}>{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
    </tr>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 16px" }}>
      <span style={{ color: "#57534e" }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}

function TextBlock({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div>
      <div style={{ fontWeight: 800, color, marginBottom: 4, fontSize: 13.5 }}>{title}</div>
      <div style={{ whiteSpace: "pre-wrap", color: "#44403c", fontSize: 12.5 }}>{text}</div>
    </div>
  );
}
