-- Purus CRM — contacts table
create extension if not exists pgcrypto;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null default 'Other',
  handle_or_url text,
  follower_count integer,
  niche text,
  status text not null default 'Identified'
    check (status in ('Identified', 'Contacted', 'Negotiating', 'Agreed', 'Posted', 'Tracking')),
  offer_code text,
  contact_info text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every edit.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_set_updated_at on contacts;
create trigger contacts_set_updated_at
before update on contacts
for each row execute function set_updated_at();

-- Single-user tool: any authenticated session may manage all rows.
alter table contacts enable row level security;

drop policy if exists "Authenticated users can manage contacts" on contacts;
create policy "Authenticated users can manage contacts"
on contacts for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
