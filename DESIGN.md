# DESIGN.md — NARCO PROTOCOL

Recorded from the built world after the finish review. The owner revised the original dark
"cartel ledger" direction mid-build to: **"much cleaner, lighter."** This document describes
the shipped world; the dark world is retired and must not leak back in (one deliberate
exception: the app icon tile stays dark as a brand mark).

## World

Calm, light productivity surface. Warm paper page, white cards, a single amber accent,
charcoal primary actions. Identity lives in the **segmented meter** and the wordmark
`NARCO.` — never in ornament. No gradients, no glassmorphism, no stamps/rotations, no
uppercase-tracked mono labels, no eyebrow/kicker pairs, no emoji as UI icons (lucide only;
emoji allowed in emails).

## Tokens (`app/globals.css` — names kept from v1, values define the world)

| Token | Value | Role |
|---|---|---|
| `void` | `#F7F5F1` | page background |
| `panel` | `#FFFFFF` | cards, sheets, toasts |
| `panel2` | `#F2EFE9` | active nav, hover wash |
| `well` | `#F5F2EC` | inputs, stat tiles |
| `line` / `linehi` | `#E7E3DA` / `#D6D0C2` | borders |
| `gold` | `#D9A441` | amber **fills**: meter segments, checked ticks, chips-on |
| `goldhi` | `#8A5F1B` | amber **text** / strong accent (≥4.5:1 everywhere used) |
| `golddeep` | `#8A6A2F` | subtle amber text ("system" tags, empty-state icons) |
| `cream` | `#211D15` | primary ink (also charcoal button fill) |
| `ash` | `#6E675A` | secondary ink |
| `faint` | `#6F6857` | minor ink (still ≥4.5:1 on page/white) |
| `blood` / `blooddim` | `#B3362A` / `#C6453A` | danger text / fill |

VaultRow undone segment: literal `#CBC3AF` (non-text relief vs card).
Placeholder ink: `#756D5C`. Selection: `#EACB8B`.

## Type

**Archivo only** (next/font, `--font-archivo`), 15px/1.55 body.
`.display-num` = 800 weight, -0.02em, tabular-nums — the score %, Day N, big counters.
`.ledger-head` = 13.5px / 650 / `#4A4438` — section headings, sentence case, icon at left.
`.field-label` = 12px / 550 / ash. No uppercase tracking anywhere in-app.

## Signature: the segmented meter (`VaultRow`)

One meter language carries ALL progress: day score (one segment per scored item), the
10-application quota (10 segments), game limit (15-min slots). Segments recolor via spring
(`backgroundColor` animate), never remount. Danger (overdue calls, over-limit play) turns
segments `blooddim`. Entrances start visible (opacity 0.55 / scaleY 0.5) — never from 0.

## Components (`components/ui.jsx`)

- `.card` — white, 1px `line`, radius 14, shadow `0 1px 2px rgb(28 25 18/.04)`.
- `.btn-gold` — **charcoal** primary (`#211D15` → hover `#3A342B`); amber is never a button fill except the `offer` status pill.
- `.chip` — pill, white, `data-on` → amber wash + `goldhi` text; min 28px, meal chips 32px.
- `TickBox` — 30px, amber fill when checked, spring path-draw check.
- `Sheet` — bottom sheet (mobile) / centered (desktop), focus-trapped, Esc closes.
- `TwoTap` — destructive confirm without browser dialogs.
- `.stamp` — quiet verdict pill (border+wash), no rotation. `stamp-gold` for wins.
- Inputs — `well` fill, amber focus ring; **16px font under 768px** (iOS zoom guard).

## Charts (`components/viz.jsx`)

Touch-first: readout line above the plot instead of hover tooltips. Bars max-w-11,
rounded tops, 3px gaps, dashed reference lines in `faint`. Heatmap: sequential amber ramp
light→dark (`#EFE6D2 → #7D5A1A`), legend row, RTL-start so the present is visible.
Dot strips encode with shape+color (amber square / red ✕ / dash), never color alone.
Chart text wears ink tokens, never series color.

## Motion

One spring family (stiffness 300-500, damping 24-36). Page transition: y-offset only.
List stagger ≤0.5s total, from visible defaults. `MotionConfig reducedMotion="user"` +
CSS `prefers-reduced-motion` fallbacks. No entrance may hide content (rAF-throttle safe).

## Voice

Short imperatives, sentence case: "Log application", "Log bedtime", "Schedule".
Empty states coach ("Ten a day. Log the first one and the empire starts moving.").
Errors name the problem and the fix. Flavor stays in content (quote line, "Day complete"),
never in control labels. Emails match the app world: paper bg, white card, amber top border.
