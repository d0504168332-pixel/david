-- QuoteCraft — סכמה ראשונית (אידמפוטנטית)

create extension if not exists pgcrypto;

-- ===== עסקים =====
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  tax_id text,
  primary_color text not null default '#1f3a5f',
  accent_color text not null default '#c8a35a',
  template text not null default 'modern',
  vat_rate numeric not null default 18,
  default_notes text,
  default_terms text default E'ההצעה בתוקף ל-30 יום מתאריך הפקתה.\nתנאי תשלום: שוטף + 30.\nהמחירים אינם כוללים מע"מ אלא אם צוין אחרת.',
  quote_prefix text not null default 'Q-',
  quote_start_number int not null default 1001,
  show_tax_id boolean not null default true,
  show_website boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== פרופילי משתמשים =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  job_title text,
  phone text,
  business_id uuid references public.businesses(id) on delete set null,
  business_role text not null default 'member' check (business_role in ('manager','member')),
  is_super_admin boolean not null default false,
  is_active boolean not null default true,
  signature_style text not null default 'amatic',
  signature_image text,
  signature_color text not null default '#1e3a8a',
  stamp_color text not null default '#1d4ed8',
  stamp_shape text not null default 'modern',
  show_signature boolean not null default true,
  show_stamp boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists profiles_business_idx on public.profiles(business_id);

-- ===== לקוחות =====
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  tax_id text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists clients_business_idx on public.clients(business_id);

-- ===== הצעות מחיר =====
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  number int,
  title text,
  client_name text not null default '',
  client_contact text,
  client_phone text,
  client_email text,
  client_address text,
  client_tax_id text,
  issue_date date not null default current_date,
  valid_until date,
  status text not null default 'draft' check (status in ('draft','sent','approved','rejected')),
  items jsonb not null default '[]'::jsonb,
  discount_type text not null default 'percent' check (discount_type in ('percent','amount')),
  discount_value numeric not null default 0,
  vat_enabled boolean not null default true,
  vat_rate numeric not null default 18,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  notes text,
  terms text,
  share_token uuid not null default gen_random_uuid() unique,
  approved_by_name text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quotes_business_idx on public.quotes(business_id, created_at desc);
create index if not exists quotes_creator_idx on public.quotes(created_by);

-- ===== הגדרות מערכת =====
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  allow_signup boolean not null default false
);
insert into public.app_settings (id) values (1) on conflict do nothing;

-- ===== פונקציות עזר ל-RLS =====
create or replace function public.my_business_id() returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_business_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select business_role = 'manager' from public.profiles where id = auth.uid() and is_active), false)
$$;

-- מניעת שינוי עמודות רגישות בפרופיל ע"י משתמש רגיל
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_super_admin() then
    return new;
  end if;
  if new.is_super_admin is distinct from old.is_super_admin
     or new.business_id is distinct from old.business_id
     or new.business_role is distinct from old.business_role
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- מספור אוטומטי של הצעות לפי עסק
create or replace function public.assign_quote_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare start_n int;
begin
  if new.number is null then
    select quote_start_number into start_n from public.businesses where id = new.business_id;
    select greatest(coalesce(max(number), 0) + 1, coalesce(start_n, 1001))
      into new.number from public.quotes where business_id = new.business_id;
  end if;
  return new;
end $$;
drop trigger if exists assign_quote_number on public.quotes;
create trigger assign_quote_number before insert on public.quotes
  for each row execute function public.assign_quote_number();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists quotes_touch on public.quotes;
create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

-- ===== RLS =====
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.quotes enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses for select to authenticated
  using (id = public.my_business_id() or public.is_super_admin());
drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses for update to authenticated
  using ((id = public.my_business_id() and public.is_business_manager()) or public.is_super_admin())
  with check ((id = public.my_business_id() and public.is_business_manager()) or public.is_super_admin());
drop policy if exists businesses_admin_insert on public.businesses;
create policy businesses_admin_insert on public.businesses for insert to authenticated
  with check (public.is_super_admin());
drop policy if exists businesses_admin_delete on public.businesses;
create policy businesses_admin_delete on public.businesses for delete to authenticated
  using (public.is_super_admin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or business_id = public.my_business_id() or public.is_super_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

drop policy if exists clients_all on public.clients;
create policy clients_all on public.clients for all to authenticated
  using (business_id = public.my_business_id() or public.is_super_admin())
  with check (business_id = public.my_business_id() or public.is_super_admin());

drop policy if exists quotes_all on public.quotes;
create policy quotes_all on public.quotes for all to authenticated
  using (business_id = public.my_business_id() or public.is_super_admin())
  with check (business_id = public.my_business_id() or public.is_super_admin());

drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated using (true);
drop policy if exists app_settings_update on public.app_settings;
create policy app_settings_update on public.app_settings for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ===== אחסון לוגואים (קריאה ציבורית, כתיבה דרך השרת בלבד) =====
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

-- keep-alive
create or replace function public.keepalive() returns int
language sql stable as $$ select 1 $$;

-- ===== בקשות להצעת מחיר מהלקוחות (צד לקוח) =====
alter table public.businesses add column if not exists request_token uuid not null default gen_random_uuid();
alter table public.businesses add column if not exists request_form_type text not null default 'general';
alter table public.businesses add column if not exists request_intro text;
alter table public.businesses add column if not exists webhook_url text;
alter table public.businesses add column if not exists webhook_secret text default encode(gen_random_bytes(18), 'hex');
create unique index if not exists businesses_request_token_idx on public.businesses(request_token);

-- פרטי נסיעה / מידע נוסף שמגיע עם ההצעה (למשל לסנכרון למערכת ההסעות)
alter table public.quotes add column if not exists meta jsonb not null default '{}'::jsonb;
alter table public.quotes add column if not exists request_id uuid;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'new' check (status in ('new','quoted','closed')),
  client_name text not null,
  client_contact text,
  client_phone text,
  client_email text,
  request_text text,
  items jsonb not null default '[]'::jsonb,
  trip jsonb,
  notes text,
  quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists quote_requests_business_idx on public.quote_requests(business_id, created_at desc);
alter table public.quote_requests enable row level security;
drop policy if exists quote_requests_all on public.quote_requests;
create policy quote_requests_all on public.quote_requests for all to authenticated
  using (business_id = public.my_business_id() or public.is_super_admin())
  with check (business_id = public.my_business_id() or public.is_super_admin());

-- יומן שליחות למערכות חיצוניות (Webhook)
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete cascade,
  event text not null,
  url text not null,
  status_code int,
  ok boolean not null default false,
  response text,
  created_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_quote_idx on public.webhook_deliveries(quote_id, created_at desc);
alter table public.webhook_deliveries enable row level security;
drop policy if exists webhook_deliveries_select on public.webhook_deliveries;
create policy webhook_deliveries_select on public.webhook_deliveries for select to authenticated
  using (business_id = public.my_business_id() or public.is_super_admin());

-- ===== קליטת בקשות במייל =====
alter table public.businesses add column if not exists inbox_code text not null default substr(md5(random()::text || clock_timestamp()::text), 1, 10);
create unique index if not exists businesses_inbox_code_idx on public.businesses(inbox_code);
alter table public.quote_requests add column if not exists source text not null default 'form';
alter table public.quote_requests add column if not exists subject text;
