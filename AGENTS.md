# UnifyHub — Agent Design & Code Taste Guide

This file tells any coding agent working in this repository how UnifyHub should
*look, move, and feel* — the project's "taste" — so that every new UI lands as
if a designer had built it. It is instructions-only markdown: no executable
code, no install step, no supply-chain surface. Read it before writing UI, and
re-check it when touching existing components.

## Product identity

UnifyHub is a **personal command station**: one calm, deliberate view of
everything a student or professional does — email, deadlines, calendar, files —
across Google, Microsoft, and developer ecosystems. The visual language is
**"commanded calm"**: dense information presented with frosted-glass serenity.
It should never feel like a generic admin panel, and never like a toy.

## Non-negotiables (break these and the UI is wrong)

1. **Token-driven color only.** Every color comes from CSS variables in
   `src/index.css` (`--primary`, `--card`, `--ambient-1/2`, `--status-*`, …)
   bridged through the Tailwind v4 `@theme inline` block. Never hard-code hex
   values in components (provider brand logos are the one exception).
2. **Three themes must all work.** Dark (amber `#e8a54b` on graphite), light
   (burnt amber `#b45309` on warm paper), and aesthetic (ultraviolet `#9d5cfc`
   on midnight). Test any new color-bearing UI in all three via the `.dark`,
   `.light`, `.aesthetic` root classes.
3. **`prefers-reduced-motion` is a first-class state.** Every animated
   component checks `useReducedMotion()` (Framer Motion) and degrades to a
   still-rich static version — never to a bare, dead-looking one.
4. **Glass, not flat.** Surfaces use `backdrop-blur` + translucency
   (`bg-card/80`, `.glass-panel`) with hairline borders
   (`border-border/40–70`) and the layered `--shadow-card` elevation tokens.

## Typography

- Display/headings: `font-display` (Bricolage Grotesque) — tight tracking
  (`tracking-tight`, `-0.03em`), extrabold weights, `leading-[1.12]` for hero
  lines.
- Body/UI: Source Sans 3 (the default), `text-xs sm:text-sm` for controls.
- Timestamps, countdowns, source tags: `font-mono` (IBM Plex Mono) with
  `font-feature-settings: 'tnum' on, 'zero' on` (`.font-tabular`).
- Uppercase micro-labels: `text-xs font-mono uppercase tracking-widest
  font-medium text-muted-foreground` — used for widget captions like
  "NEXT MEETING".

## Motion

- Framer Motion springs: `stiffness 420–520, damping 28–30`. Entrances: fade +
  10px rise, 0.3s, ease `[0.21, 0.47, 0.32, 0.98]`, staggered via `delay`.
- Hover lift: `y: -1` to `-3`, optional subtle tilt on bento cards.
- Ambient effects (orbs, glow, particles) are `aria-hidden`, pure CSS
  keyframes where possible, and pause under reduced motion.
- Animate only `transform`, `opacity`, and `filter` in hot paths.

## Color roles

- Accent/CTA: `--primary` (+ `--primary-hover`). Glow: `--shadow-glow`.
- Status: emerald `--status-connected`, sky `--status-syncing`, amber
  `--status-warning`, rose `--status-error` — never invent new semantic hues.
- Account identity dots (Cornell blue, emerald, amber, coral) are fixed brand
  semantics from the design system; reuse, don't redesign.
- Urgency heat: critical = deep rose pulse, high = amber, medium = sky, normal
  = muted slate.

## Layout

- Bento-grid command station. Cards are `Card variant="bento"` — rounded-3xl,
  translucent, blurred. Density is calm: hover-reveal secondary controls
  rather than visible button clutter.
- Page rhythm: sticky blurred header (`border-border/40 bg-background/85
  backdrop-blur-xl`), max-w-6xl content, generous `py-10 sm:py-16`, footer
  with `font-mono text-xs` legal/links row.
- Empty states are guides, not dead ends: name the missing thing and offer a
  one-click action.
- Zero-state banner ("Demo data"), `Badge` pills, and status dots are part of
  the information scent — keep them.

## Component conventions

- New primitives live in `src/components/ui/` as self-contained,
  reduced-motion-aware files (see `button.tsx`, `card.tsx`,
  `liquid-button.tsx`) and accept `className` via `cn()` merge.
- Buttons: min-height 44–48px, rounded-2xl, `focus-visible:ring-2
  focus-visible:ring-primary`, spring tap `scale: 0.96–0.97`.
- Icons: lucide-react at `w-3.5 h-3.5` (inline) or `w-4 h-4`/`w-5 h-5`
  (feature), always with text or `aria-label`.
- Date/time rendering goes through the helpers in `src/lib/utils.ts`; times
  are ISO 8601 UTC in the data layer, browser-localized in the view.

## Frontend taste checklist (run before considering UI done)

- [ ] All three themes checked — no washed-out text, no invisible borders.
- [ ] `prefers-reduced-motion`: static version still looks intentional.
- [ ] Contrast: label text over any new gradient/fill passes WCAG AA.
- [ ] Only token colors; no new one-off hex values.
- [ ] Motion is springy but calm — no bounce, no spin-for-attention.
- [ ] Keyboard focus rings intact; tab order logical.
- [ ] Mobile: bottom nav unaffected, cards stack 1-col, no horizontal scroll.
- [ ] Zero console errors or React key warnings.

## Code style

- TypeScript strict; no `any` in new code. `React.FC` typing consistent with
  existing pages.
- Zustand for app state, TanStack Query for server state — never mix.
- Queries use the shared kebab-case query-key constants; invalidations must
  hit the exact keys consumers read.
- OAuth/sync network code belongs in Edge Functions (`supabase/functions/`),
  never in the client bundle; secrets never touch `import.meta.env`.

## Why this file exists

Applying strong frontend taste does not require installing a third-party
"taste" skill from an unknown source. `npx skills add <user>/<repo>` executes
code from a random GitHub account with zero review history — the same risk
category as any unverified package. Everything that skill promised (taste,
motion, 3D touches, bento layout discipline) is captured here as plain
markdown instructions, which any agent can read with no supply-chain risk.
Keep this file updated as the design system evolves.
