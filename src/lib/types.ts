export type Business = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  primary_color: string;
  accent_color: string;
  template: TemplateId;
  vat_rate: number;
  default_notes: string | null;
  default_terms: string | null;
  quote_prefix: string;
  quote_start_number: number;
  show_tax_id: boolean;
  show_website: boolean;
  is_active: boolean;
  request_token: string;
  inbox_code: string;
  business_type: "general" | "transport";
  request_form_type: "general" | "transport";
  request_intro: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  ops_emails: string | null;
  pricing: Pricing | null;
  reminder_days: number;
  reminder_max: number;
  notify_on_view: boolean;
  notify_on_approve: boolean;
  created_at: string;
};

/** מחירון קבוע לחברת הסעות */
export type Vehicle = {
  id: string;
  name: string; // "מיניבוס 20 מקומות"
  seats: number;
  per_km: number; // ₪ לק"מ
  min_price: number; // מחיר מינימום לנסיעה
  wait_hour: number; // ₪ לשעת המתנה
};

export type Pricing = {
  vehicles?: Vehicle[];
  night_pct?: number; // תוספת לילה %
  night_from?: string; // "22:00"
  night_to?: string; // "06:00"
  weekend_pct?: number; // תוספת שבת/חג %
  friday_from?: string; // "15:00" — מאז מתחילה תוספת שבת ביום שישי
  free_wait_hours?: number; // שעות המתנה שלא מחויבות
  round_up?: number; // עיגול כלפי מעלה (למשל 10 ₪)
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  job_title: string | null;
  phone: string | null;
  business_id: string | null;
  business_role: "manager" | "member";
  is_super_admin: boolean;
  is_active: boolean;
  signature_style: SignatureStyle;
  signature_image: string | null;
  signature_color: string;
  stamp_color: string;
  stamp_shape: "modern" | "inline" | "round" | "rect";
  show_signature: boolean;
  show_stamp: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  business_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  portal_token?: string;
  created_at: string;
};

export type QuoteItem = {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  unit_price: number;
  /** שייך לאפשרות מסוימת (ריק = כלול בכל האפשרויות) */
  option?: string;
};

export type QuoteOption = { id: string; label: string };

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected";

export type Quote = {
  id: string;
  business_id: string;
  created_by: string | null;
  client_id: string | null;
  number: number | null;
  title: string | null;
  client_name: string;
  client_contact: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  client_tax_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status: QuoteStatus;
  items: QuoteItem[];
  discount_type: "percent" | "amount";
  discount_value: number;
  vat_enabled: boolean;
  vat_rate: number;
  subtotal: number;
  total: number;
  notes: string | null;
  terms: string | null;
  share_token: string;
  approved_by_name: string | null;
  approved_at: string | null;
  meta: QuoteMeta;
  request_id: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  last_viewed_at?: string | null;
  view_count?: number;
  reminded_at?: string | null;
  reminder_count?: number;
  created_at: string;
  updated_at: string;
};

export type Trip = {
  date?: string;
  time?: string;
  origin?: string;
  destination?: string;
  passengers?: number;
  round_trip?: boolean;
  return_time?: string;
  stops?: string;
  /** תאריכים נוספים לאותה נסיעה (הסעה חוזרת) */
  extra_dates?: string[];
  distance_km?: number; // כיוון אחד
  duration_min?: number; // כיוון אחד
};

export type QuoteMeta = {
  trip?: Trip | null;
  /** כמה אפשרויות באותה הצעה — הלקוח בוחר אחת באישור */
  options?: QuoteOption[];
  chosen_option?: string | null;
};

export type QuoteTemplate = {
  id: string;
  business_id: string;
  name: string;
  title: string | null;
  items: QuoteItem[];
  notes: string | null;
  terms: string | null;
  meta: QuoteMeta;
  created_at: string;
};

export type QuoteRequest = {
  id: string;
  business_id: string;
  status: "new" | "quoted" | "closed";
  client_name: string;
  client_contact: string | null;
  client_phone: string | null;
  client_email: string | null;
  request_text: string | null;
  items: { description: string; quantity: number }[];
  trip: Trip | null;
  notes: string | null;
  quote_id: string | null;
  client_id?: string | null;
  source?: "form" | "email";
  subject?: string | null;
  created_at: string;
};

export type TemplateId = "modern" | "classic" | "minimal" | "bold";
export type SignatureStyle = "amatic" | "karantina" | "caveat" | "dancing" | "vibes" | "drawn";
