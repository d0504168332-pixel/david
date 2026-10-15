/** כתובת המייל הייחודית של העסק לקליטת בקשות */
export function inboxAddress(code: string | null | undefined) {
  const base = process.env.INBOUND_EMAIL_ADDRESS?.trim();
  if (!base || !code) return null;
  if (base.includes("{code}")) return base.replace("{code}", code);
  const [local, domain] = base.split("@");
  return domain ? `${local}+${code}@${domain}` : null;
}
