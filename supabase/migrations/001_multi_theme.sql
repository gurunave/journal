-- Migration: one theme per incident -> many.
-- Run this ONLY if you already ran schema.sql before this change. A fresh
-- install of schema.sql already has the new shape. Safe to run twice.

alter table public.incidents
  add column if not exists themes text[] not null default '{}';

-- Carry the old single value across before the column goes away.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'incidents' and column_name = 'category'
  ) then
    update public.incidents
       set themes = array[category]
     where category is not null
       and cardinality(themes) = 0;

    alter table public.incidents drop column category;
  end if;
end;
$$;

create index if not exists incidents_themes_idx
  on public.incidents using gin (themes);
