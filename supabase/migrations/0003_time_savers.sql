-- QuoteCraft — חוסכי זמן: מחירון, תזכורות, התראות צפייה, תבניות (אידמפוטנטי)

-- ===== מחירון והגדרות אוטומציה לעסק =====
alter table public.businesses add column if not exists pricing jsonb not null default '{}'::jsonb;
alter table public.businesses add column if not exists reminder_days int not null default 3;      -- 0 = כבוי
alter table public.businesses add column if not exists reminder_max int not null default 2;        -- כמה תזכורות לכל היותר
alter table public.businesses add column if not exists notify_on_view boolean not null default true;
alter table public.businesses add column if not exists notify_on_approve boolean not null default true;

-- ===== מעקב שליחה / צפייה / תזכורות בהצעה =====
alter table public.quotes add column if not exists sent_at timestamptz;
alter table public.quotes add column if not exists viewed_at timestamptz;
alter table public.quotes add column if not exists last_viewed_at timestamptz;
alter table public.quotes add column if not exists view_count int not null default 0;
alter table public.quotes add column if not exists reminded_at timestamptz;
alter table public.quotes add column if not exists reminder_count int not null default 0;
create index if not exists quotes_followup_idx on public.quotes(business_id, status, sent_at);

-- הצעות שכבר נשלחו לפני העדכון: תאריך שליחה משוער
update public.quotes set sent_at = updated_at where sent_at is null and status in ('sent','approved','rejected');

-- ===== תבניות הצעה =====
create table if not exists public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  title text,
  items jsonb not null default '[]'::jsonb,
  notes text,
  terms text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists quote_templates_business_idx on public.quote_templates(business_id, name);
alter table public.quote_templates enable row level security;
drop policy if exists quote_templates_all on public.quote_templates;
create policy quote_templates_all on public.quote_templates for all to authenticated
  using (business_id = public.my_business_id() or public.is_super_admin())
  with check (business_id = public.my_business_id() or public.is_super_admin());
