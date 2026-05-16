-- meet-jakesciotto-com schema, v1
-- Run in Supabase SQL editor before deploying code that references these tables.

create extension if not exists "pgcrypto";

-- Weekday availability windows. Multiple rows per weekday = multiple windows (e.g., 9-12 and 1-5).
create table if not exists availability_rules (
  id           uuid primary key default gen_random_uuid(),
  weekday      smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_minute smallint not null check (start_minute between 0 and 1439),  -- minutes from midnight, host TZ
  end_minute   smallint not null check (end_minute between 0 and 1440),
  check (end_minute > start_minute)
);

-- One-off date blocks (vacation, day off). Date in host TZ.
create table if not exists blocked_dates (
  date  date primary key,
  note  text
);

-- Audit log. Google Calendar is the source of truth; this exists so invitees can cancel by id.
create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  google_event_id text not null unique,
  invitee_name    text not null,
  invitee_email   text not null,
  invitee_phone   text,
  conferencing    text not null check (conferencing in ('meet', 'phone')),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists bookings_starts_at_idx on bookings (starts_at);

-- Admin's Google OAuth refresh token. Single row, gated to allowlisted email.
create table if not exists admin_google_oauth (
  email         text primary key,
  refresh_token text not null,
  scopes        text not null,
  updated_at    timestamptz not null default now()
);

-- Row level security
alter table availability_rules enable row level security;
alter table blocked_dates enable row level security;
alter table bookings enable row level security;
alter table admin_google_oauth enable row level security;

-- Public read for booking-page essentials
create policy availability_rules_read on availability_rules for select using (true);
create policy blocked_dates_read on blocked_dates for select using (true);

-- bookings and admin_google_oauth have NO policies, so they are reachable only via service role.
