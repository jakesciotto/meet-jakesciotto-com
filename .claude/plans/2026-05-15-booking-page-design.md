# Booking Page Design

**Date:** 2026-05-15
**Status:** Draft, pending user review
**Author:** Jake Sciotto (jake.sciotto@gmail.com), brainstormed with Claude

## Goal

Replace Zoom Scheduler with a self-hosted booking page at `meet.jakesciotto.com`. Anyone with the link picks a slot, fills a short form, and the booking lands on Jake's Google Calendar with the chosen conferencing option (Google Meet or phone). Admin (Jake) configures weekday availability and blocked dates through a Google-OAuth-gated `/admin` page.

## Constraints and Preferences

- Single host (Jake only)
- Light theme, shadcn primitives, mobile-first, simple
- Speed is a feature: server-rendered where possible, per-day cache on Google reads, prefetch between booking steps
- No emojis in code, comments, or planning docs (per `.claude/rules/REPOSITORY.md`)
- Integration branch is `staging`, not `main`
- Vercel deploy target (rules out disk-based persistence)

## Scope

### In scope (v1)

- One meeting type, 30-minute slots, aligned to `:00` and `:30`
- Custom availability: per-weekday windows configurable via admin UI
- Blocked dates configurable via admin UI
- Pulls busy times from Google Calendar
- Creates Google Calendar event with attendees and the chosen conferencing option
- Conferencing options at booking time: Google Meet (default), phone call
- Confirmation email to invitee (with `.ics` fallback) and host
- Cancellation flow via link in confirmation email
- 24-hour minimum notice, 60-day booking horizon
- Admin login via Google OAuth, allowlisted to `jake.sciotto@gmail.com`

### Out of scope (v1)

- Multiple meeting types or per-type availability
- Buffer times, custom booking-form questions, reminders beyond confirmation
- Multi-host / multi-tenant
- Pulling availability from non-Google calendars (Outlook, iCloud)
- Rescheduling flow (cancel and rebook covers it for now)
- Public sign-up

## Architecture

### Stack

- Next.js 16 (App Router) + Tailwind + shadcn/ui
- Supabase (Postgres) for admin state and booking audit log
- Vercel deploy
- Google Calendar API for free/busy reads, event inserts, Meet links
- Resend (or equivalent) for transactional email

### Logical surfaces

- **Public booking page** (`/`) — date picker, slot list, booking form. No auth. Server actions only.
- **Admin** (`/admin`) — Google OAuth gated to `jake.sciotto@gmail.com`. Edit weekday availability and blocked dates. Stores the OAuth refresh token used for Calendar API calls.
- **`lib/google-calendar`** — owns all Calendar API access (free/busy, event insert, Meet conferenceData). Uses the admin's stored refresh token. 5-minute in-memory cache per date for free/busy reads.

### Source of truth

- Availability rules and blocked dates: Supabase
- Bookings: Google Calendar is canonical. Supabase keeps a thin `bookings` audit row for cancellation lookup. Calendar wins on conflict.

### Slot computation strategy (Approach A)

The invitee picks a date. A server action fetches that date's free/busy from Google Calendar, subtracts blocked dates and existing bookings, intersects with availability rules, and returns a list of free start times. The client never sees raw busy windows. Per-date cache (5 minutes) on warm lambdas keeps repeat clicks instant.

Rejected alternatives:

- **Pre-compute 60-day grid on page load** — heavier initial payload, more wasted compute, leaks 60 days of busy windows to the client
- **Static daily cron into Supabase** — staleness risk on the booking action itself; trades correctness for speed in the wrong direction

## Data Model (Supabase)

```sql
-- Weekday availability windows. Multiple rows per weekday = multiple windows (e.g., 9-12 and 1-5).
availability_rules (
  id           uuid primary key default gen_random_uuid(),
  weekday      smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_minute smallint not null check (start_minute between 0 and 1439),  -- minutes from midnight, host TZ
  end_minute   smallint not null check (end_minute   between 0 and 1440),
  check (end_minute > start_minute)
);

-- One-off date blocks (vacation, day off). Date in host TZ.
blocked_dates (
  date  date primary key,
  note  text
);

-- Audit log. Google Calendar is the source of truth; this exists so invitees can cancel by id
-- and so we can look up bookings without round-tripping Google.
bookings (
  id                uuid primary key default gen_random_uuid(),
  google_event_id   text not null unique,
  invitee_name      text not null,
  invitee_email     text not null,
  invitee_phone     text,                          -- only if conferencing = 'phone'
  conferencing      text not null check (conferencing in ('meet','phone')),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- Admin's Google OAuth refresh token. Single row, gated to allowlisted email.
admin_google_oauth (
  email          text primary key,
  refresh_token  text not null,                    -- encrypted at rest via Supabase Vault
  scopes         text not null,
  updated_at     timestamptz not null default now()
);
```

### RLS

- `availability_rules` and `blocked_dates`: public-read (booking page needs them), admin-write only
- `bookings` and `admin_google_oauth`: service-role only

### Timezone handling

- All availability is stored in the host's local timezone, configured via `HOST_TZ` env var (e.g., `America/New_York`)
- Slot computation runs in host TZ
- Slots are displayed to the invitee in their local TZ
- Stored in `timestamptz` (UTC) in `bookings`

## Component / Route Breakdown

```
app/
  page.tsx                          # Public booking page (server component)
  book/
    [date]/page.tsx                 # Slot list for a chosen date
    confirm/page.tsx                # Booking form (name, email, phone if needed, conferencing)
    success/[bookingId]/page.tsx    # Confirmation page with cancel link
    cancel/[bookingId]/page.tsx     # Cancellation confirmation
  admin/
    page.tsx                        # Admin dashboard (weekday rules + blocked dates)
    login/page.tsx                  # Google OAuth entry
  api/
    auth/google/route.ts            # OAuth callback (admin login + Calendar grant)

lib/
  google-calendar.ts                # All Calendar API access: freeBusy, insertEvent, Meet links
  email.ts                          # Resend wrapper (confirmation, cancellation)
  slots.ts                          # Pure slot computation (no I/O), trivially testable
  supabase.ts                       # Browser + server-side clients
  auth.ts                           # Admin session check, allowlist enforcement
  config.ts                         # HOST_TZ, SLOT_MINUTES=30, MIN_NOTICE_HOURS=24, HORIZON_DAYS=60

actions/
  get-slots.ts                      # Server action: (date) -> Slot[], per-day cache
  create-booking.ts                 # Server action: insert event, send emails, write audit row
  cancel-booking.ts                 # Server action: delete event, mark cancelled, send email
  set-availability.ts               # Admin server action: upsert weekday rules
  set-blocked-date.ts               # Admin server action: add/remove blocked date

components/
  date-picker.tsx                   # Calendar grid, disables blocked + no-availability days
  slot-list.tsx                     # Renders Slot[] as buttons
  booking-form.tsx                  # Name/email/phone/conferencing selector
  conferencing-radio.tsx            # Meet / Phone selector (phone reveals phone field)
  admin/availability-editor.tsx     # Per-weekday window editor
  admin/blocked-dates-editor.tsx    # Add/remove blocked dates
```

### Why this shape

- `lib/slots.ts` is pure: given (rules, busy ranges, blocked dates, date, config) it returns slots. No I/O makes it trivially unit-testable.
- `lib/google-calendar.ts` is the only module that touches the Calendar API. Easy to mock at the boundary.
- Server actions in `actions/` keep mutation logic out of routes. Routes orchestrate UI.
- The booking flow uses distinct routes (`/book/[date]` then `/book/confirm` then `/book/success/[id]`) so URLs are shareable, the browser back button works, and each route has one job.

## Data Flow

### Booking flow (the hot path, optimized for speed)

```
1. GET /                              Server component renders date picker.
                                      Cached server fetch: availability_rules + next 60 days of blocked_dates.
                                      Picker disables blocked days and days with no rules. Zero JS for initial paint.

2. Click date -> /book/[date]         Server action getSlots(date):
                                        a. Read availability_rules for that weekday
                                        b. Google freeBusy() for that date       <- only network call
                                        c. Read bookings for that date
                                        d. lib/slots.ts computes free slots
                                        e. Return Slot[]
                                      Per-date 5-min in-memory cache on warm lambdas -> repeat clicks instant.

3. Click slot -> /book/confirm?date=...&start=...
                                      Pre-filled, just the form. Conferencing radio.
                                      Phone input shows iff phone selected.

4. Submit -> server action createBooking():
                                        a. Re-run getSlots to verify slot still free (race guard)
                                        b. google-calendar.insertEvent() with attendees + conference data
                                           (conferenceData.createRequest for Meet, or location='Phone' with invitee number)
                                        c. Insert bookings row
                                        d. email.send(confirmation) with .ics fallback
                                        e. redirect /book/success/[bookingId]
```

### Cancellation flow

Invitee clicks cancel link in confirmation email -> `/book/cancel/[bookingId]` -> confirm button -> server action: delete the Google Calendar event with `sendUpdates=all` (Google emails the attendee cancellation), mark `cancelled_at` on the audit row, send our own cancellation notice with a link back to `/` for rebooking.

### Admin flow

```
/admin/login   Google OAuth (scopes: calendar.events, userinfo.email)
               Callback verifies email == jake.sciotto@gmail.com, stores refresh_token.
               Sets HTTP-only session cookie.

/admin         Edit weekday windows (form per weekday, "+window" button)
               Manage blocked dates (date picker + list with remove buttons)
               Both use server actions with optimistic updates, no full page reload.
```

### Speed and mobile choices baked in

- Pages are server components by default. Only date picker, slot list, and form are client components.
- `<Link prefetch>` between booking steps so the next route is warm.
- shadcn `Calendar`, `Button`, `Input`, `RadioGroup`, `Sheet` (mobile admin drawer). No custom heavy components.
- Mobile layout is single-column always. Slot list is vertical full-width buttons (>= 44px tap target). Date picker uses shadcn's responsive Calendar.

## Error Handling and Edge Cases

### Race: two invitees pick the same slot

`createBooking` re-runs `getSlots` for that date immediately before inserting the event. If the chosen slot is no longer in the list, return a "slot taken" error and redirect back to the date with a banner. No DB locks needed at this scale.

### Google API failures

- `freeBusy` fails -> show "We couldn't load times, retry" on slot page. No partial state.
- `insertEvent` fails -> show error, don't write audit row, don't send emails. Invitee sees the form again with retry notice.

### Email failure after successful booking

Calendar event already exists. Log the email failure, surface "we couldn't email the confirmation, but you're booked for X" on the success page with a manual `.ics` download link. Do not roll back the Calendar event.

### Expired/revoked Google refresh token

Server actions touching Calendar wrap calls in a try/catch for `invalid_grant`. On failure: mark the token row stale, return a clear error ("Reconnect Google in /admin"), don't silently fail. The booking page shows "Booking temporarily unavailable" with a contact email instead of a broken slot picker.

### Slot computation edge cases (covered by `lib/slots.ts` unit tests)

- DST transitions (slots shouldn't disappear or duplicate)
- Booking exactly at min-notice boundary
- Slot that would extend past the availability window's end
- Invitee timezone differs from host timezone (display in invitee TZ, store UTC, compute in host TZ)
- Day with availability rules but every slot busy -> empty state, not error
- Day with no availability rules -> not clickable in the picker

### Auth edge cases

- Non-allowlisted Google account tries to log in -> reject at callback, show "not authorized"
- Admin session expired -> redirect to `/admin/login`, preserve return-to path

## Testing

### Unit tests (Vitest) for `lib/slots.ts`

Pure module, high coverage pays off forever.

- Standard weekday produces expected slot count
- All slots busy returns empty array
- DST spring-forward and fall-back days
- Min-notice boundary (slot exactly 24h out vs 23h59m)
- Slot would end past availability window
- Multiple availability windows in one day
- Invitee TZ differs from host TZ
- Blocked date returns empty array regardless of free time

### Integration tests (Vitest) for server actions

Real Supabase test schema, mocked Google Calendar.

- `getSlots`: real Supabase + mocked `google-calendar.freeBusy`
- `createBooking` happy path: event insert called with correct conferenceData (Meet) or location (phone), audit row written, email enqueued
- `createBooking` race: slot becomes busy between display and submit -> returns "slot taken"
- `createBooking` email failure: Calendar event exists, audit row exists, error surfaced

### E2E (Playwright)

- Happy path: pick date -> pick slot -> fill form -> confirm -> see success page
- Cancel path: click cancel link from confirmation -> confirm -> see cancellation page

### Manual mobile testing before merge

Real iPhone Safari and Android Chrome on the booking flow. Mobile responsiveness is a release gate.

### Explicitly skipped

- Tests against real Google Calendar API (flaky, requires creds). Mock at the `lib/google-calendar.ts` boundary.
- Visual regression for v1. shadcn primitives plus Tailwind classes are stable enough.

## Defaults (v1)

| Setting              | Value                |
|----------------------|----------------------|
| Slot length          | 30 minutes           |
| Slot alignment       | `:00` and `:30`      |
| Minimum notice       | 24 hours from current time (slot `start - now >= 24h`) |
| Booking horizon      | 60 days from current date |
| Host timezone        | env: `HOST_TZ`       |
| Allowlisted admin    | `jake.sciotto@gmail.com` |

## Open Questions

- Resend vs. another email provider (Postmark, AWS SES)? Resend has the cleanest DX, suggested unless there's an existing preference.
- Do we want the cancellation page to also offer "reschedule" by deep-linking back to the date picker? Lightweight UX win, not currently in scope.
- Should the admin dashboard show recent bookings (read from `bookings` table)? Useful but not strictly v1.
