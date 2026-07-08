---
name: mood-tracker-style
description: Project-level design system and visual style guide for this Mood Tracker React/Tailwind app. Use when Codex designs, edits, reviews, or implements UI screens, components, charts, modals, navigation, copy, or visual states in this repository, especially under src/App.tsx, src/components, src/index.css, and src/types.ts.
---

# Mood Tracker Style

## Workflow

Before changing UI, inspect the current source of truth:

- `src/index.css` for theme fonts and natural color tokens.
- `src/types.ts` for mood and activity color semantics.
- Nearby components in `src/components/` for card, chart, modal, and control patterns.
- `src/App.tsx` for the phone shell, bottom navigation, tab structure, and global spacing rhythm.

Preserve the app's identity: a calm mobile mood diary with soft wellness cues, playful emoji data marks, compact health insights, and a polished phone-app frame. Prefer continuity over novelty unless the user explicitly asks for a redesign.

## Visual Identity

Design for a "natural wellness phone app" rather than an enterprise analytics dashboard. The UI should feel quiet, tactile, encouraging, and personal.

Use these defining traits:

- Mobile-first smartphone frame: centered shell, rounded desktop phone container, scrollable inner pane, fixed bottom nav.
- Warm natural surfaces: beige page background, near-white phone surface, white cards, low-contrast borders.
- Sage green as the primary action and success color.
- Terracotta as reward, premium, journal, or warm emphasis.
- Emoji as meaningful data markers, not random decoration.
- Data visualization that reads like a diary insight: light grids, rounded marks, small tooltips, plain-language conclusions.
- Gamification through points, plants, badges, and gentle unlock states.

Avoid these drifts:

- Corporate SaaS dashboards, dense tables, heavy chrome, sharp rectangular panels.
- Marketing landing-page composition, oversized heroes, decorative cards inside cards.
- Loud gradients, neon colors, glassmorphism as the main visual language.
- Full dark mode styling except for isolated premium/upgrade surfaces.
- Excessive beige-only screens; keep sage, terracotta, mood colors, and occasional indigo/rose utility accents in play.

## Tokens

Use the existing Tailwind theme values from `src/index.css`:

```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
--font-display: "Space Grotesk", sans-serif;

--color-natural-bg: #EAE7E2;
--color-natural-phone: #F9F8F6;
--color-natural-sage: #8FA88B;
--color-natural-cream: #E6D5B8;
--color-natural-terracotta: #D48166;
--color-natural-border: #F2EDE9;
--color-natural-text: #4A4540;
```

Keep the mood scale semantic:

- Rating 5 / `#8FA88B`: best mood, primary green.
- Rating 4 / `#A9C2A5`: soft positive green.
- Rating 3 / `#E6D5B8`: neutral cream.
- Rating 2 / `#D48166`: tired or warm warning.
- Rating 1 / `#BCAFA4`: subdued difficult mood.

Use `font-mono` for dates, counts, points, steps, hours, ranks, and exact values. Use `font-sans` for most interface text. Use `font-display` sparingly for high-personality headings if adding new prominent surfaces; do not force it into every card.

## Layout

Keep the app screen compact and thumb-friendly:

- Root background: `bg-[#EAE7E2]`.
- Phone shell: full width on mobile, `sm:max-w-[420px]`, `sm:h-[860px]`, `bg-[#F9F8F6]`, `sm:rounded-[40px]`, white desktop border, hidden overflow.
- Main content pane: vertical scrolling, `px-5`, `pt-8`, `pb-24`, `scrollbar-none`.
- Page sections: flex columns with `gap-4` or `gap-5`.
- Cards: generally `bg-white rounded-3xl p-5` or `p-6`, `border border-[#F2EDE9]` or `border-gray-100/60`, and `shadow-xs`/`shadow-sm`.
- Nested content panels: use softer fills such as `bg-gray-50/50`, `bg-[#E6F0E6]/30`, or `bg-[#FAF0ED]/40`; keep them lighter than the parent.

Prefer rounded-full pills for filters, primary actions, badges, and nav affordances. Use rounded-2xl for controls and small panels. Use rounded-3xl for major cards and product-like shop tiles.

## Components

### Cards

Use cards as contained app modules, not decorative page sections. A standard analytics card should include:

- A short Chinese title in `text-lg font-medium text-gray-800` or `text-[#4A4540]`.
- Optional small badge in `text-[11px]`, rounded-lg, high contrast.
- Compact body content with generous inner spacing.
- Empty state with one emoji, a short instruction, and muted gray text.

### Buttons and Controls

Use lucide-react icons when the action has a familiar symbol. Match existing controls:

- Primary action: `bg-[#8FA88B] hover:bg-[#7D9779] text-white rounded-full shadow-md active:scale-95`.
- Secondary chip: white or gray-50 surface, soft border, `text-xs` or `text-[10px]`.
- Segmented control: muted gray track, white selected tab, sage selected text, small shadow.
- Inputs: `bg-gray-50`, soft border, rounded-xl/2xl, sage focus border, no heavy outlines.
- Icon-only dismiss/help/delete buttons: circular hit area, muted default color, clearer hover color.

Keep button labels short and action-oriented in Chinese. Preserve sentence case and avoid marketing slogans.

### Bottom Navigation

The bottom nav is a signature part of this app. Preserve:

- Fixed white bar, top border, height around `h-20`.
- Four tab buttons with lucide icons and `text-[10px] font-bold` labels.
- Active tab: sage text, slight scale, stronger icon stroke.
- Center floating log button: circular sage button, plus icon, white border, raised above nav, with count text.

### Modal Drawer

Use bottom-sheet drawers for mobile input flows:

- Overlay: dark translucent backdrop with subtle blur.
- Drawer: `bg-white`, `rounded-t-[32px]`, `max-h-[92vh]`, scrollable, `p-6`, `shadow-2xl`.
- Include a small drag-handle decorator.
- Structure fields as stacked sections with clear labels, small icons, and rounded controls.

### Charts and Data Visualization

Prefer custom lightweight SVG or simple DOM charts over heavy chart-library styling. Match existing chart language:

- Height around 180px for compact cards.
- Light grid lines: `#eef1ee`, `#f1f3f1`, or `#f3f5f3`.
- Axis labels in muted green-gray such as `#99a399`.
- Rounded bars, dots, and progress segments.
- Mood-colored marks pulled from `MOODS`.
- Tooltips: `bg-white/95`, subtle blur, soft border, rounded-xl, shadow-lg, `text-xs`.
- Insight banners: pale sage background, green text, one emoji/icon, plain helpful sentence.

Use ResizeObserver for SVG width when a chart must respond inside the phone shell. Keep labels legible at 360-420px widths.

### Gamification

Keep rewards cozy and tangible:

- Points use star icons and `font-mono`.
- Plant/shop items use emoji as large product visuals in rounded tiles.
- Unlocked state uses sage border/fill and a small check badge.
- Premium can use a dark isolated card or warm crown/terracotta accent, but do not convert the whole app to a premium-dark palette.

## Copy Voice

Write UI copy in warm, concise Chinese. The voice should feel like a gentle health companion, not a salesperson or therapist.

Use:

- Direct labels: `打卡日志`, `趋势报告`, `积分小店`, `个人中心`.
- Plain insights: `本月尚无步数记录。`, `日均步行状况良好！身体舒展，心情也会更加开朗舒畅。`
- Empty states that name the next action.
- Gentle encouragement after logging, unlocking, or completing streaks.

Avoid:

- Vague error text.
- Long motivational paragraphs.
- Technical implementation terms in visible UI, except small localStorage disclaimers already present.
- Overly cute language that makes health data feel unserious.

## Implementation Checks

When adding or changing UI:

- Keep text inside buttons, chips, cards, and bottom nav labels from wrapping awkwardly at mobile widths.
- Avoid card nesting unless the inner surface is a functional control, chart band, shop shelf, or metric tile.
- Respect existing `scrollbar-none` behavior for horizontal chips and ranking lists.
- Use stable dimensions for icon buttons, chart areas, emoji markers, and nav controls.
- Run `pnpm build` or `pnpm lint` after code changes when dependencies are installed.
- For meaningful visual changes, run the app and inspect the 420px phone frame plus a narrow mobile viewport before calling the work complete.
