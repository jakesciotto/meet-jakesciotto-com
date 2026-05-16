-- Add invitee_company to bookings.
-- Run in Supabase SQL editor BEFORE deploying code that references this column.

alter table bookings
  add column if not exists invitee_company text;
