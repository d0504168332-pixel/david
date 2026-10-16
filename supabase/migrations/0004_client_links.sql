-- קישור אישי ללקוח קבוע: פרטי הלקוח ממולאים אוטומטית בטופס הבקשה
alter table public.clients add column if not exists portal_token uuid not null default gen_random_uuid();
create unique index if not exists clients_portal_token_idx on public.clients(portal_token);
alter table public.quote_requests add column if not exists client_id uuid references public.clients(id) on delete set null;
