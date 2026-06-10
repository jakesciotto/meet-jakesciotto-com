# Mission Control Reskin — Design Spec

Date: 2026-06-09
Status: Approved pending review

## Goal

Reskin the entire site (public booking pages + admin) with a "Mission Control" aesthetic: dark only, Apollo-console inspired. Visual change only — no copy changes, no layout changes, no new functionality.

## Decisions (settled during brainstorm)

| Decision | Choice |
|---|---|
| Scope | Whole site |
| Theme modes | Dark only; light theme deleted |
| Aesthetic | Mission Control: warm black, amber chrome, green reserved for live state |
| Color semantics | Amber = actions/chrome/focus; green = selected/live/success; red = destructive (unchanged) |
| Copy | Unchanged ("Book a time", "Save" — no console theater) |
| Typography | Hybrid: Geist Sans body/headings, Geist Mono for times, dates, labels, status |
| Admin | Reskin only, same two editors |
| Architecture | Token-driven; all styling lives in components via Tailwind utilities |

## Token System (`app/globals.css`)

The file shrinks to: two imports, one `:root` block, one `@theme inline` block. Target ~70 lines. No `@layer base` styling, no keyframes, no media queries.

Palette (oklch, warm hue ~85-95 for neutrals):

- `--background`: warm black, ~`oklch(0.13 0.005 95)`
- `--card` / `--popover`: lifted warm dark, ~`oklch(0.16 0.008 90)`
- `--border` / `--input`: umber, ~`oklch(0.28 0.02 85)`
- `--foreground`: warm cream
- `--muted` / `--muted-foreground`: warm grays
- `--primary` / `--ring`: amber ~`oklch(0.78 0.15 75)`, `--primary-foreground` near-black
- `--signal` / `--signal-foreground`: brand green (current dark `--primary` green), NEW tokens exposed through `@theme inline` so `bg-signal`, `text-signal`, `border-signal` utilities exist
- `--destructive`: unchanged red
- `--radius`: `0.25rem` (console corners)

## Styling Relocation (out of globals.css)

| Was in globals.css | Moves to |
|---|---|
| Body bg color, font stack, gradient wash | `className` on `<body>` in `app/layout.tsx`; wash becomes one faint amber radial via arbitrary value |
| Global cursor-pointer rule | `cursor-pointer` in interactive `components/ui/*` variants (button, calendar, radio-group, sheet triggers) |
| Custom keyframes + `.anim-in-fade*` classes | Deleted; components use `tw-animate-css` utilities instead |
| `[data-slot="calendar"]` entrance animation | Animation classes inside `components/ui/calendar.tsx` |

Grep for `anim-in-fade` users before deleting; replace in-component.

## Component Pass

All changes are Tailwind utility classes inside components. No new CSS files, no CSS modules.

| File | Change |
|---|---|
| `app/layout.tsx` | Body: warm-black bg, faint amber radial wash, font classes |
| `components/ui/button.tsx` | Amber primary (via token), cursor-pointer, subtle amber glow on hover (`shadow` arbitrary value using `--primary`) |
| `components/slot-list.tsx` | Times in `font-mono`; selected slot `bg-signal text-signal-foreground` + green glow |
| `components/ui/calendar.tsx` | Selected day green (`signal`), today indicator amber, day numerals `font-mono`, entrance animation class |
| `components/booking-form.tsx` | Mono on date/time display, label styling |
| `components/booking-picker.tsx` | Mono on date/time display |
| `components/cancel-button.tsx` | Inherits destructive token; verify only |
| `app/page.tsx`, `app/book/**` | Replace any hardcoded color classes; mono on time/date text |
| `app/admin/**`, `components/admin/*` | Same treatment: mono labels/times, amber actions, green success states |
| `components/ui/{card,input,alert,label,radio-group,sheet}.tsx` | Inherit tokens; touch only if radius/contrast needs it |

## Out of Scope

- Copy changes (no "LAUNCH WINDOWS" etc.)
- Layout or UX changes to admin editors
- Bookings/telemetry panel in admin
- Light theme support

## Verification

1. `pnpm typecheck`, `pnpm build`, `pnpm test` all pass.
2. Dev-server visual pass on all routes: `/`, `/book/[date]`, `/book/confirm`, `/book/success/[id]`, `/book/cancel/[id]`, `/admin/login`, `/admin`.
3. Contrast: amber-on-black and green-on-black meet WCAG AA for text usage (check at implementation; both accents are high-lightness so expected to pass; `--muted-foreground` must stay >= 4.5:1 on `--card`).
4. `grep -r "prefers-color-scheme\|anim-in-fade" app components` returns nothing after the pass.
5. Reduced-motion: tw-animate-css utilities respect `prefers-reduced-motion`; confirm calendar entrance does.

## Risks

- Removing global cursor rule may drop pointer affordance on an interactive element not in `components/ui` — sweep `role="button"`, `label[for]`, `summary` usages.
- `--signal` is a non-standard shadcn token; document it in this spec as the only custom token. Anything green must use it rather than hardcoded hex.
- Deleting the light theme changes `<meta name="color-scheme">` expectations; set `colorScheme: "dark"` in root layout metadata/viewport so form controls and scrollbars render dark.
