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
  agreed_to_post boolean not null default false,
  last_followed_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe to re-run on a database that already has the contacts table from
-- before these columns existed.
alter table contacts add column if not exists agreed_to_post boolean not null default false;
alter table contacts add column if not exists last_followed_up date;

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

-- Leads dismissed from Find Leads search results, with why — kept so future
-- searches can exclude them instead of resurfacing the same rejected profile.
create table if not exists rejected_leads (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  handle text not null,
  handle_or_url text,
  reason text,
  created_at timestamptz not null default now(),
  unique (platform, handle)
);

alter table rejected_leads enable row level security;

drop policy if exists "Authenticated users can manage rejected leads" on rejected_leads;
create policy "Authenticated users can manage rejected leads"
on rejected_leads for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Extra contact methods beyond a contact's primary handle_or_url (e.g. a
-- second platform, an email, a phone/WhatsApp number). handle_or_url on
-- contacts stays as the primary channel — this table is purely additive.
create table if not exists contact_channels (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  type text not null default 'Other',
  value text not null,
  created_at timestamptz not null default now()
);

alter table contact_channels enable row level security;

drop policy if exists "Authenticated users can manage contact channels" on contact_channels;
create policy "Authenticated users can manage contact channels"
on contact_channels for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
