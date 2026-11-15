---
name: Warm Levantine Modern
colors:
  surface: '#f6fbf5'
  surface-dim: '#d7dbd6'
  surface-bright: '#f6fbf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f5f0'
  surface-container: '#ebefea'
  surface-container-high: '#e5e9e4'
  surface-container-highest: '#dfe4df'
  on-surface: '#181d1a'
  on-surface-variant: '#58413d'
  inverse-surface: '#2c322e'
  inverse-on-surface: '#edf2ed'
  outline: '#8c716c'
  outline-variant: '#e0bfba'
  surface-tint: '#ab3425'
  primary: '#a83223'
  on-primary: '#ffffff'
  primary-container: '#c94a38'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a8'
  secondary: '#895200'
  on-secondary: '#ffffff'
  secondary-container: '#fead4d'
  on-secondary-container: '#704200'
  tertiary: '#42634c'
  on-tertiary: '#ffffff'
  tertiary-container: '#5b7c63'
  on-tertiary-container: '#f6fff4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410100'
  on-primary-fixed-variant: '#8a1c10'
  secondary-fixed: '#ffdcbc'
  secondary-fixed-dim: '#ffb86a'
  on-secondary-fixed: '#2c1700'
  on-secondary-fixed-variant: '#683d00'
  tertiary-fixed: '#c7ecce'
  tertiary-fixed-dim: '#abcfb2'
  on-tertiary-fixed: '#01210f'
  on-tertiary-fixed-variant: '#2e4e37'
  background: '#f6fbf5'
  on-background: '#181d1a'
  surface-variant: '#dfe4df'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system captures the dynamic, layered pulse of modern Jerusalem culture. It bridges ancient stone-paved alleys with vibrant underground youth culture, live music in Mahane Yehuda, indie screenings in Nachlaot, and rooftop gatherings in Rehavia. The target audience comprises students, creatives, young professionals, and locals aged 20–35 seeking community and spontaneous urban discovery.

The design movement combines **warm tactile minimalism** with **contemporary editorial structure**:
- Sun-bleached limestone and warm plaster surfaces replace sterile tech-gray backdrops.
- Expressive, energetic Mediterranean accents punctuate utility surfaces without visual clutter.
- Tactile, pressable micro-surfaces echo local texture and artisanal warmth rather than cold glass or glossy skeumorphism.
- The interface feels lived-in, grounded, welcoming, and immediate—like a weathered map annotated by an in-the-know friend.

## Colors

The palette is derived directly from Jerusalem's material and nocturnal identity:

- **Primary (`#E05A47` - Warm Terracotta):** Used for primary conversion triggers, active states, key tags, and heart/save interactions. Evokes sun-baked roof tiles and late-afternoon terrace light.
- **Secondary (`#E89A3C` - Sun Amber):** Used for date filters, time badges, warnings, and lively event tags (happy hours, live music). Evokes brass fixtures, outdoor lighting, and citrus stands.
- **Tertiary (`#4A6B53` - Deep Olive Sage):** Used for community/neighborhood indicators (Nachlaot, Beit HaKerem), green spaces, and verified student markers.
- **Accent Indigo (`#2B3A67` - Night Indigo):** Used for late-night venues, bar crawls, DJ sets, and inverted state badges.
- **Neutrals & Surfaces:**
  - `Canvas / Background Base`: `#FBF9F5` (Polished Jerusalem stone)
  - `Surface Container Low`: `#F3EFEA` (Warm limestone wash)
  - `Surface Container High / Borders`: `#E8E2D8` (Sandstone mortar)
  - `Typography Primary`: `#1F2421` (Desert Ink)
  - `Typography Muted`: `#5C6460` (Weathered Basalt)

## Typography

The typography relies on **Plus Jakarta Sans** across all hierarchies. Its wide proportions, clean terminals, and subtle geometric curves provide an energetic yet legible voice that stays razor-sharp under direct sunlight on mobile screens.

- **Headlines:** Set in tight-tracking bold and extrabold weights. They provide rapid scanability when browsing noisy event lineups.
- **Body:** Open counters and a generous x-height ensure effortless readability for venue descriptions, lineup notes, and access instructions.
- **Labels & Badges:** Capitalization and higher tracking (`0.02em` to `0.04em`) are leveraged for micro-tags (e.g., neighborhood chips, entrance fees, door times).

## Layout & Spacing

The layout is built mobile-first on a 4-column grid (phones) scaling to an 8-column layout (tablets/foldables) and a 12-column constrained canvas (desktop web preview capped at 480px width or centered in tablet viewports).

- **Mobile Viewport Focus:** 16px (`1rem`) outer canvas margins maximize touch target area while ensuring breathing room against device bezels.
- **Rhythm:** Spacing follows a 4px base unit. Micro-spacing (`space-xs` and `space-sm`) separates inline meta-information like dates, icons, and venue stamps. Component padding uses `space-md` for compact cards and `space-lg` for prominent featured event tiles.
- **Sticky Zones:** View toggles (List/Map) and date selectors anchor within a floating, sticky header zone 8px below the top navigation bar to maintain immediate context during rapid scrolling.

## Elevation & Depth

Visual hierarchy does not rely on heavy artificial drop shadows. Instead, it uses **tonal layer stacking with warm ambient grounding**:

- **Level 0 (Canvas):** Flat `#FBF9F5` base background.
- **Level 1 (Cards & Modules):** Pure `#FFFFFF` or `#F3EFEA` surfaces bordered with a 1px solid `#E8E2D8` structural edge. An ambient shadow tinted with Desert Ink (`rgba(31, 36, 33, 0.04)`, 0px offset, 8px blur) establishes subtle tactile elevation.
- **Level 2 (Active Cards, Overlays, and Modals):** Tinted warm shadow (`rgba(31, 36, 33, 0.08)`, 4px y-offset, 16px blur) paired with crisp borders.
- **Level 3 (Floating Action Controls & Modals):** Used for the Map/List toggle switch and date pills: a directional shadow (`rgba(31, 36, 33, 0.12)`, 6px y-offset, 20px blur) elevates tools above scrollable feeds.

## Shapes

The design uses a balanced rounded geometry (level `2`):

- **Standard Elements (0.5rem / 8px):** Input fields, inline badges, and secondary buttons.
- **Cards & Sheets (`rounded-lg` / 1rem / 16px):** Event cards, venue summaries, and bottom sheets.
- **Selectors & Chips (`rounded-full` / Pill-shape):** Date pills ("Today", "This Weekend"), neighborhood pills ("Mahane Yehuda"), and the List/Map segment switch utilize fully rounded pill shapes to convey interactive flexibility.

## Components

### Buttons
- **Primary:** Terracotta (`#E05A47`) solid background with white text (`#FFFFFF`), `rounded-lg`, 48px minimum touch height, subtle press state scale (`0.98`).
- **Secondary:** Surface `#F3EFEA` with a 1px border of `#E8E2D8`, text in `#1F2421`.
- **Ghost/Tertiary:** No background, `#1F2421` text with subtle hover tinting in `#E8E2D8`.

### Event Discovery Cards
- **Structure:** 16px internal padding, white background over `#FBF9F5` canvas, bordered with 1px `#E8E2D8`.
- **Media Header:** 16:9 or 4:3 rounded thumbnail with an absolute top-left neighborhood tag and top-right bookmark/favorite icon button.
- **Content Block:** Event date/time in `#E89A3C` (Amber, bold label), title in Desert Ink (`headline-md`), venue subtext with distance (e.g., "Sira Bar • 450m away").

### Neighborhood & Venue Badges
- Semi-translucent tonal chips with high-contrast text:
  - *Mahane Yehuda:* Amber tint (`#FDF4E7` bg, `#C27318` text).
  - *Nachlaot:* Olive tint (`#EDF3EF` bg, `#37533E` text).
  - *Rehavia:* Night indigo tint (`#EAEFF9` bg, `#243156` text).
  - *Downtown:* Terracotta tint (`#FCEDE9` bg, `#B83E2D` text).

### Date Pill Selectors
- Horizontal scrolling pill strip with `space-sm` gaps.
- **Unselected:** Background `#F3EFEA`, border `#E8E2D8`, label color `#5C6460`.
- **Selected:** Background `#1F2421`, border `#1F2421`, text `#FBF9F5`, font weight bold.

### List / Map Segmented Switch
- Centered floating control at the bottom of the viewport (elevated 24px above bottom edge).
- Pill container in `#FFFFFF` with 1px `#E8E2D8` border and Level 3 elevation.
- Selected state has an active pill slider in `#1F2421` with inverted text and haptic feedback.

### Form Inputs & Search Fields
- 48px height with `#F3EFEA` background, transitioning to `#FFFFFF` on active focus.
- 1px border in `#E8E2D8`, shifting to `#E05A47` on focus.
- Embedded leading search icon and trailing filter trigger button.