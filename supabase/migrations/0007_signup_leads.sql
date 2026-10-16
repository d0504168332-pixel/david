-- בקשות מנוי מגולשים שאין להם משתמש (דף /join). נגיש לשרת בלבד.
create table if not exists public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  business_name text,
  phone text not null,
  email text,
  business_type text,
  team_size text,
  message text,
  status text not null default 'new', -- new | done
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists signup_leads_created_idx on public.signup_leads(created_at desc);
alter table public.signup_leads enable row level security;

-- מנהל המערכת יכול לחבר מייל גם בלי עסק משלו (לקבלת בקשות מנוי)
alter table public.mail_accounts alter column business_id drop not null;
