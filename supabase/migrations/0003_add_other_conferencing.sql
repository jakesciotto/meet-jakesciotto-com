-- Add 'other' conferencing option with a free-form meeting link (Teams, Zoom personal, etc.).
-- Run in Supabase SQL editor BEFORE deploying code that references the new option.

alter table bookings
  drop constraint if exists bookings_conferencing_check;

alter table bookings
  add constraint bookings_conferencing_check
  check (conferencing in ('meet', 'phone', 'other'));

alter table bookings
  add column if not exists meeting_link text;
