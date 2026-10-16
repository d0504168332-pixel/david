-- תיבות מייל לשליחה: לכל עובד המייל שלו, ולכל עסק מייל כללי (גיבוי)
-- הסיסמה נשמרת מוצפנת, והטבלה נגישה לשרת בלבד (אין מדיניות RLS לגולשים)
create table if not exists public.mail_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  smtp_host text not null,
  smtp_port int not null default 465,
  smtp_user text not null,
  secret_enc text not null,
  verified_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
create unique index if not exists mail_accounts_profile_idx on public.mail_accounts(profile_id) where profile_id is not null;
create unique index if not exists mail_accounts_business_idx on public.mail_accounts(business_id) where profile_id is null;
alter table public.mail_accounts enable row level security;
