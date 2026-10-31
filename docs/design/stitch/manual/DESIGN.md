---
name: Autonomous Growth Console
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#908fa1'
  outline-variant: '#464555'
  surface-tint: '#c1c1ff'
  primary: '#c1c1ff'
  on-primary: '#1500a8'
  primary-container: '#5b5bf0'
  on-primary-container: '#f6f2ff'
  inverse-primary: '#4948de'
  secondary: '#4ae176'
  on-secondary: '#003915'
  secondary-container: '#00b954'
  on-secondary-container: '#004119'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#9c6300'
  on-tertiary-container: '#fff2e7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1dfff'
  primary-fixed-dim: '#c1c1ff'
  on-primary-fixed: '#09006b'
  on-primary-fixed-variant: '#2e29c6'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-badge:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style
The design system targets solo operators and boutique agency owners juggling business operations, client pipelines, and revenue delivery. The personality is grounded, deliberate, calm, and reassuringly technical—an antidote to stressful, chaotic analytics platforms. It avoids synthetic hyperbole, vanity metrics, and dense enterprise jargon in favor of immediate situational awareness and plain English direction.

Visually, the style pairs Modern SaaS utility with subtle ambient depth. High-contrast typography cuts cleanly through rich deep-navy surfaces, while soft chromatic glows highlight active states, progress, and priority focus points. The UI feels composed and serene, projecting institutional stability with the agility expected by modern independent operators.

## Colors
The palette leverages a low-strain, high-contrast dark foundation. Canvas background anchors at `#0B1020` with elevated container cards at `#121A2F`. 

- **Primary (`#5B5BF0`):** Electric indigo dedicated to primary calls to action, active navigation, interactive focal states, and subtle focus glows.
- **Secondary / Positive (`#22C55E`):** Clear emerald representing healthy growth, completed pipelines, on-track retainers, and confirmed transactions.
- **Tertiary / Warning (`#F59E0B`):** Vibrant amber for attention items, pending invoices, impending capacity limits, and compact "DEMO" badges.
- **Negative / Alert (`#EF4444`):** Crisp coral red applied selectively to lapsed retainers, churn risks, and failed payments.
- **Neutrals (`#F8FAFC`, `#94A3B8`, `#64748B`, `#1E293B`):** Primary text renders in pure soft white (`#F8FAFC`), secondary labels in slate gray (`#94A3B8`), structural meta labels in muted slate (`#64748B`), and internal card dividers and subtle borders in dark slate (`#1E293B`).

Every status color token must maintain WCAG AAA compliant contrast against `#121A2F` cards. Color is never used as the sole conveyor of state; status icons must always accompany chromatic signals.

## Typography
Typography is set entirely in **Inter** to ensure maximum legibility and systematic UI cohesion across density-heavy dashboards. 

- **Scale & Baseline:** Core operational body copy defaults to a generous, readable 16px (`body-lg`) with a 1.5 line height ratio. Dense metadata tables and secondary notes scale down to 14px (`body-md`).
- **Hierarchy:** Primary financial metrics and high-impact revenue totals use `display-lg` with tight letter tracking to emphasize precision. Section headers balance strong weights (`600`) with modest scale ratios to avoid visual noise.
- **Clarity over Jargon:** Copy rules strictly mandate plain-spoken labels (e.g., use "Active Retainers" instead of "Recurring ARR Units", and "Overdue" instead of "Aging Accounts").

## Layout & Spacing
The layout follows a fluid 12-column grid anchored inside a maximum container width of `1440px`.

- **Desktop (1200px+):** 12 columns with `1.5rem` (24px) gutters and `2rem` (32px) margins. KPI summaries span 3 columns each; operational feeds and pipelines span 8 and 4 columns respectively.
- **Tablet (768px - 1199px):** 8 columns with `1rem` (16px) gutters. Dashboard metrics collapse into 4-column pairs.
- **Mobile (< 768px):** Single-column stacked fluid flow with `1rem` outer canvas padding. Complex metrics collapse into horizontal swipe rails or vertically grouped priority rows.
- **Rhythm:** Internal card padding is generous (`space-lg` / 24px) to preserve cognitive breathing room around numbers, actionable buttons, and live alerts.

## Elevation & Depth
Elevation in this system uses surface-container stepping paired with subtle luminescent glows rather than muddy, pitch-black shadows.

- **Surface Tiers:**
  - `Level 0 (Canvas)`: `#0B1020` — Main viewport background.
  - `Level 1 (Card Default)`: `#121A2F` — Core dashboard components, tables, and metric cards. Border: `1px solid rgba(148, 163, 184, 0.08)`.
  - `Level 2 (Hover & Elevated Layers)`: `#18223D` — Interactive cards upon hover, modals, flyouts, and dropdown panels. Border: `1px solid rgba(148, 163, 184, 0.16)`.
- **Atmospheric Glows:**
  - Primary Active Glow: `0 0 20px -4px rgba(91, 91, 240, 0.35)` applied to focused action items and active toggles.
  - Card Ambient Elevation: `0 8px 24px -6px rgba(3, 7, 18, 0.5)` with no directional downward drop, keeping cards floating uniformly.
- **Separation:** Boundaries rely on clean, 1px low-contrast strokes (`rgba(148, 163, 184, 0.08)`) instead of heavy outlines.

## Shapes
The system establishes a tailored roundedness baseline with a signature radius of `14px` (`0.875rem`) for cards, modal containers, and prominent dashboard groupings. 

- **Cards & Surfaces:** Exactly `14px` corner radii, generating a smooth, modern envelope that prevents harsh rectangular geometry.
- **Interactive Controls (Inputs, Buttons, Dropdowns):** `10px` (`rounded-md`) to sit harmoniously nested inside parent cards without corner tension.
- **Badges & Pills:** Full pill radius (`9999px`) for demo indicators, status capsules, and user avatars to provide immediate geometric contrast against structural cards.

## Components

### Buttons
- **Primary:** Filled `#5B5BF0` background, pure white text, 10px corner radius, padding `10px 18px`. Hover states apply subtle illumination (`box-shadow: 0 0 16px rgba(91, 91, 240, 0.45)`).
- **Secondary / Ghost:** Transparent background with `#1E293B` stroke and `#94A3B8` text. Hover transitions to `#18223D` background and `#F8FAFC` text.
- **Icon Buttons:** Fixed 40x40px container, centered stroke icon, 10px radius, low-contrast border.

### Status Indicators & Chips
- **Status Pairings:** Every status chip must strictly pair an inline icon (e.g., check circle, warning triangle, clock) with human-readable text. 
  - *Healthy:* Green dot/check icon + text "On Track" or "Paid" (Background: `rgba(34, 197, 94, 0.12)`, Text: `#22C55E`).
  - *Attention:* Amber caution icon + text "Needs Review" or "Pending" (Background: `rgba(245, 158, 11, 0.12)`, Text: `#F59E0B`).
  - *Alert:* Red octagonal/alert icon + text "Action Required" (Background: `rgba(239, 68, 68, 0.12)`, Text: `#EF4444`).
- **DEMO Badge:** Distinct small tag with orange amber fill (`#F59E0B`), dark text or high-contrast amber tint, bold uppercase label (`label-badge`), `padding: 2px 6px`, fully rounded pill. Placed adjacent to sample data feeds.

### Metric Cards
- Background: `#121A2F`, 14px border radius, `1px solid rgba(148, 163, 184, 0.08)`, padding `24px`.
- Structure: Header row containing human-readable metric name and meta action icon; large numerical metric in `display-lg`; footer row with comparative trend indicator (emerald arrow + "+14% vs last month") accompanied by plain context.

### Form Inputs & Fields
- Dark input fields (`#0B1020` background) inset inside `#121A2F` cards.
- Border: `1px solid #1E293B`. Focused state transitions to `1px solid #5B5BF0` with a `0 0 0 3px rgba(91, 91, 240, 0.2)` ring.
- Placeholder text in `#64748B`, user entry text in `#F8FAFC`.

### Checkboxes & Radio Controls
- Custom controls with 6px border radius (checkboxes) and full circle (radios).
- Inactive: `#0B1020` base with `1px solid #64748B`.
- Checked: `#5B5BF0` fill with crisp white vector checkmark and subtle indigo halo.

### Action Feeds & List Rows
- Horizontal rows separated by hair-thin `rgba(148, 163, 184, 0.06)` dividers.
- Hover changes the row background smoothly to `rgba(255, 255, 255, 0.02)`.
- Left-aligned icon and plain-language action title; right-aligned timestamps and status badges.