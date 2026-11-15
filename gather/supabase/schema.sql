-- Gather — Supabase schema
-- Run once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: drops and recreates the policies, grants and indexes (the table is kept).
--
-- Access model
--   anon (the public website, using the anon key):
--     SELECT  only rows with status = 'active', and never the poster_contact column
--     INSERT  only private submissions: origin = 'private' AND status = 'draft'
--     no UPDATE, no DELETE
--   service_role (pipeline/publish.py) and the dashboard's Table Editor bypass RLS.

create extension if not exists pgcrypto;  -- gen_random_uuid() (built in on PG13+, harmless otherwise)

create table if not exists public.events (
  id             uuid        primary key default gen_random_uuid(),
  title          text        not null check (char_length(title) between 1 and 300),
  description    text                 check (description is null or char_length(description) <= 5000),
  start_time     timestamptz not null,
  end_time       timestamptz,
  venue_name     text,
  address        text,
  lat            double precision     check (lat is null or lat between -90 and 90),
  lng            double precision     check (lng is null or lng between -180 and 180),
  source_url     text,
  source_name    text,
  origin         text        not null check (origin in ('collected', 'private')),
  is_free        boolean     default true,  -- NULL = unknown (collected events)
  price_text     text,
  payment_link   text                 check (payment_link is null or payment_link ~* '^https?://'),
  status         text        not null default 'draft'
                             check (status in ('draft', 'active', 'cancelled', 'past')),
  dedup_key      text        unique,  -- NULLs allowed (private submissions have none)
  poster_contact text                 check (poster_contact is null or char_length(poster_contact) <= 200),
  created_at     timestamptz not null default now(),
  constraint events_end_after_start check (end_time is null or end_time >= start_time)
);

create index if not exists events_start_time_idx on public.events (start_time);
create index if not exists events_status_idx     on public.events (status);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;

drop policy if exists "anon reads active events"     on public.events;
drop policy if exists "anon submits private drafts"  on public.events;

create policy "anon reads active events"
  on public.events
  for select
  to anon
  using (status = 'active');

create policy "anon submits private drafts"
  on public.events
  for insert
  to anon
  with check (origin = 'private' and status = 'draft');

-- No UPDATE / DELETE policies for anon → those are denied by RLS.

-- ---------------------------------------------------------------------------
-- Column-level privileges
-- Supabase grants ALL on new public tables to anon/authenticated by default,
-- so revoke first, then grant back only what the site needs.
-- ---------------------------------------------------------------------------
revoke all on public.events from anon, authenticated;

-- Read: every column except poster_contact (matches PUBLIC_COLS in js/data.js).
grant select (
  id, title, description, start_time, end_time, venue_name, address, lat, lng,
  source_url, source_name, origin, is_free, price_text, payment_link, status, dedup_key
) on public.events to anon;

-- Write: exactly the fields submitPrivate() in js/data.js sends.
-- id, dedup_key, source_*, created_at are filled by defaults / the pipeline only.
grant insert (
  title, description, start_time, end_time, venue_name, address, lat, lng,
  is_free, price_text, payment_link, poster_contact, origin, status
) on public.events to anon;

-- The pipeline (pipeline/publish.py) uses the service_role key: full access, RLS bypassed.
grant all on public.events to service_role;
