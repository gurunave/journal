-- Migration: allow one capture to cover several people.
-- Rows are still one-per-person (so each keeps its own discussed_at); rows
-- written by the same capture share a group_id. Safe to run twice.

alter table public.incidents
  add column if not exists group_id uuid;

create index if not exists incidents_group_idx
  on public.incidents (group_id) where group_id is not null;
