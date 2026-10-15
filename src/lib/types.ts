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
  created_at: string;
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
  stamp_shape: "round" | "rect";
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
  created_at: string;
};

export type QuoteItem = {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  unit_price: number;
};

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
  created_at: string;
  updated_at: string;
};

export type TemplateId = "modern" | "classic" | "minimal" | "bold";
export type SignatureStyle = "amatic" | "karantina" | "caveat" | "dancing" | "vibes" | "drawn";
