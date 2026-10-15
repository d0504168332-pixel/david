-- הרצה על פרויקט קיים (אם 0001 כבר הורץ בלי חלק המייל)
alter table public.businesses add column if not exists inbox_code text not null default substr(md5(random()::text || clock_timestamp()::text), 1, 10);
create unique index if not exists businesses_inbox_code_idx on public.businesses(inbox_code);
alter table public.quote_requests add column if not exists source text not null default 'form';
alter table public.quote_requests add column if not exists subject text;
alter table public.businesses add column if not exists ops_emails text;

-- ===== סוג העסק: הסעות / כללי =====
alter table public.businesses add column if not exists business_type text not null default 'general' check (business_type in ('general','transport'));
