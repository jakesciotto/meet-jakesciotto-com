# meet.jakesciotto.com

A self-hosted booking page. Anyone with the link picks a time and books a meeting on Jake's
Google Calendar with Google Meet or a phone call.

## Stack

- Next.js 16 (App Router) + Tailwind 4 + shadcn/ui
- Supabase (Postgres) for admin state and booking audit log
- Google Calendar API for free/busy reads, event inserts, Meet links
- Resend for transactional email
- Vercel for hosting

## Setup

### 1. Provision external services

See `.claude/plans/2026-05-15-booking-page-design.md` for full setup notes. The short version:

- **Google Cloud:** create an OAuth client (Web app), enable the Calendar API, allow
  `jake.sciotto@gmail.com` as a test user. Redirect URI:
  `http://localhost:3000/api/auth/google` (dev) and `https://meet.jakesciotto.com/api/auth/google` (prod).
- **Supabase:** create a project. Apply the migration in `supabase/migrations/0001_init.sql`
  via the SQL editor.
- **Resend:** verify a sending domain, get an API key.

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in the values. Required vars:

```
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY, EMAIL_FROM
HOST_TZ, ADMIN_EMAIL, APP_URL, SESSION_SECRET
```

Generate `SESSION_SECRET` with `openssl rand -hex 32`.

### 3. Install and run

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000`. The booking page won't show any dates until you sign in at
`/admin/login` and configure weekly availability.

## Project structure

```
app/                      # Routes (App Router)
  page.tsx                # Public booking page (date picker)
  book/                   # Booking flow (slot list -> form -> success/cancel)
  admin/                  # Admin login + dashboard
  api/auth/google/        # OAuth callback
actions/                  # Server actions (mutations + reads from the client)
components/               # UI components (shadcn primitives in components/ui/)
lib/                      # Pure logic + integration wrappers
  slots.ts                # Pure slot computation (heavily tested)
  google-calendar.ts      # Google Calendar API wrapper
  email.ts                # Resend wrapper
  auth.ts                 # Admin session + OAuth state
  supabase.ts             # Supabase clients
supabase/migrations/      # SQL migrations
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production build locally |
| `pnpm test` | Run Vitest unit tests once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |

## Conventions

- Integration branch is `staging` (not `main`). Branch from `staging` and target `staging` in PRs.
- No emojis in commits, comments, or planning docs.
- Migrations always run in Supabase BEFORE deploying code that references the new tables.
