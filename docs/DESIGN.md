# Design Direction — Tiktim

The product competes on experience. It must feel like a modern consumer app (DICE, Fever, Netflix, Booking), not a directory.

## Personality

Energetic, nightlife, confident, warm. Big imagery, bold Hebrew typography, generous spacing. Fun to scroll; zero clutter.

## Principles

1. **Mobile first.** Design at 390px, then scale up. Thumb-reachable primary actions.
2. **Imagery leads.** Event cards are image-forward (16:9 or 4:5). When no licensed image exists, use a designed fallback: genre-tinted gradient + artist name in large display type. Fallbacks should look intentional, never broken.
3. **Scan in one second.** On every card: who, when (Hebrew day name + date), where (city · venue), from-price, status badge.
4. **One primary action per screen.** On the event page: "לרכישת כרטיסים". Secondary actions (save, share, calendar) are icon buttons.
5. **Honest UI.** Sponsored = clearly labeled "ממומן". Data freshness shown ("עודכן לפני 3 שעות").
6. **Motion with purpose.** Subtle card hover/press, smooth horizontal rails with snap, skeleton loaders. Respect `prefers-reduced-motion`.

## Tokens (starting point — refine in Phase 0)

- **Theme:** dark-first (nightlife feel) with a light mode. Default to dark.
- **Colors (dark):** background `#0B0B10`, surface `#15151D`, surface-2 `#1E1E29`, text `#F5F5F7`, text-muted `#A1A1B0`, border `#2A2A38`.
- **Accent:** electric magenta-to-orange gradient for brand moments (`#FF2E93 → #FF7A1A`); solid accent `#FF3D7F` for buttons/links. Ensure contrast ≥ 4.5:1 for text on accent (use dark text if needed).
- **Status colors:** sold out `#6B6B7B` (muted), few left `#FFB020`, new `#3DDC97`, cancelled/postponed `#FF5A5A`, sponsored chip outline in text-muted.
- **Genre tints** (for fallbacks/chips): rock `#E5484D`, pop `#FF3D7F`, mizrahit `#F5A524`, hiphop `#8E4EC6`, indie `#12A594`, electronic `#3E63DD`, jazz `#B08A57`, standup `#F76B15`; others derive from palette.
- **Typography:** Heebo (or Rubik). Display 32–40px/800 for hero titles, H2 22–24px/700, body 16px/400, meta 13–14px/500. Line-height 1.4 for Hebrew body.
- **Radius:** cards 16px, buttons 12px, chips full.
- **Spacing:** 4px base scale; section vertical rhythm 32–48px on mobile.

## Key components

- `SearchBar` (What / When / Where) — collapses into a single pill on scroll on mobile; opens a full-screen sheet with tabs.
- `HeroCarousel` — full-bleed, auto-advance paused on hover/focus, accessible controls, "ממומן" chip when promoted.
- `Rail` — titled horizontal list with "הכל" link, scroll-snap, arrow buttons on desktop, keyboard focusable items.
- `EventCard` — variants: rail (compact), grid (default), list (search results on desktop).
- `QuickChips` — today / tomorrow / weekend / this week / free / outdoor.
- `OfferList` — per-seller rows with price and buy button.
- `DatePicker` — Hebrew locale, week starts Sunday, range selection, accessible.
- `EmptyState`, `Skeleton`, `ErrorState` — on-brand illustrations or type-only compositions (no stock art).

## References for inspiration (study patterns, don't copy)

DICE (cards and event page), Fever (category rails and curation), Booking.com (search bar and filters), Netflix (horizontal rails), Airbnb (filter sheet on mobile).

## Brand

Name "טיקטים" is a working name pending trademark/domain check. Keep the logo as a simple wordmark component that is easy to swap.
