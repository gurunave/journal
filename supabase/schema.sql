-- Incident Journal — Supabase schema
-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.reportees (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  role        text,
  color       text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null check (length(trim(label)) > 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (owner_id, label)
);

create table if not exists public.incidents (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reportee_id  uuid not null references public.reportees (id) on delete cascade,
  occurred_at  timestamptz not null default now(),
  sentiment    text not null check (sentiment in ('positive', 'neutral', 'concern')),
  severity     smallint not null default 3 check (severity between 1 and 5),
  themes       text[] not null default '{}',
  note         text not null default '',
  photo_path   text,
  discussed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One-on-one checkpoints, so "what happened since we last talked" is answerable.
create table if not exists public.one_on_ones (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reportee_id uuid not null references public.reportees (id) on delete cascade,
  held_at     timestamptz not null default now(),
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists incidents_owner_occurred_idx
  on public.incidents (owner_id, occurred_at desc);
create index if not exists incidents_themes_idx
  on public.incidents using gin (themes);
create index if not exists incidents_reportee_occurred_idx
  on public.incidents (reportee_id, occurred_at desc);
create index if not exists reportees_owner_idx on public.reportees (owner_id, archived);
create index if not exists one_on_ones_reportee_idx on public.one_on_ones (reportee_id, held_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reportees_touch on public.reportees;
create trigger reportees_touch before update on public.reportees
  for each row execute function public.touch_updated_at();

drop trigger if exists incidents_touch on public.incidents;
create trigger incidents_touch before update on public.incidents
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security — every row is private to the manager who wrote it
-- ---------------------------------------------------------------------------

alter table public.reportees   enable row level security;
alter table public.categories  enable row level security;
alter table public.incidents   enable row level security;
alter table public.one_on_ones enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['reportees', 'categories', 'incidents', 'one_on_ones'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_delete', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = auth.uid())',
      t || '_owner_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = auth.uid())',
      t || '_owner_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      t || '_owner_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (owner_id = auth.uid())',
      t || '_owner_delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private storage bucket for incident photos.
-- Objects are stored at <auth.uid()>/<incident-id>.<ext> so the first path
-- segment is the owner check.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', false)
on conflict (id) do nothing;

drop policy if exists incident_photos_select on storage.objects;
create policy incident_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists incident_photos_insert on storage.objects;
create policy incident_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists incident_photos_update on storage.objects;
create policy incident_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists incident_photos_delete on storage.objects;
create policy incident_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Seed a starter set of categories for every new account.
-- ---------------------------------------------------------------------------

create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (owner_id, label, sort_order)
  values
    (new.id, 'Delivery',      10),
    (new.id, 'Quality',       20),
    (new.id, 'Collaboration', 30),
    (new.id, 'Ownership',     40),
    (new.id, 'Communication', 50),
    (new.id, 'Growth',        60),
    (new.id, 'Attendance',    70)
  on conflict (owner_id, label) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_categories_on_signup on auth.users;
create trigger seed_categories_on_signup
  after insert on auth.users
  for each row execute function public.seed_default_categories();
