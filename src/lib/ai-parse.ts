import "server-only";
import type { ParsedRequest } from "./parse-request";

const PROMPT = `You extract a price-quote request from an email (usually Hebrew) for a business that sends price quotes.
Return ONLY a JSON object, no prose, with exactly these keys:
{"client_name": string (the requesting company, or the person's name if no company),
 "client_contact": string (the person who wrote),
 "client_phone": string, "client_email": string, "client_address": string,
 "title": string (short Hebrew subject for the quote, max 8 words),
 "items": [{"description": string (short, in the email's language), "details": string (specs/notes for this item, may be ""), "quantity": number}],
 "hints": string (dates, deadlines, budget, special requests — internal notes for the business, "" if none)}
Rules: one item per distinct product/service requested; quantity defaults to 1; never invent prices; ignore the business's own signature and quoted older messages; empty string when unknown.`;

export async function parseWithAI(text: string): Promise<ParsedRequest | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 2000,
        system: PROMPT,
        messages: [{ role: "user", content: `<email>\n${text.slice(0, 20000)}\n</email>` }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = (data?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    const json = out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1);
    const p = JSON.parse(json);
    return {
      client_name: String(p.client_name ?? ""),
      client_contact: String(p.client_contact ?? ""),
      client_phone: String(p.client_phone ?? ""),
      client_email: String(p.client_email ?? ""),
      client_address: String(p.client_address ?? ""),
      title: String(p.title ?? ""),
      hints: String(p.hints ?? ""),
      items: Array.isArray(p.items)
        ? p.items
            .filter((i: { description?: string }) => i?.description)
            .map((i: { description: string; details?: string; quantity?: number }) => ({
              description: String(i.description),
              details: i.details ? String(i.details) : "",
              quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1,
            }))
        : [],
    };
  } catch {
    return null;
  }
}

