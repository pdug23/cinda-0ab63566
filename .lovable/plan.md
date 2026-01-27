
# Fix: Shoe Carousel Should Always Load on Middle Card

## Problem
The shoe carousel on `/recommendations` currently loads on the first card (index 0) instead of the middle card (index 1).

## Root Cause
In `src/components/results/ShoeCarousel.tsx` (line 48-49), the initial slide logic is:

```tsx
const initialSlideIndex = showRoleBadges ? 0 : (totalSlides >= 3 ? 1 : 0);
```

This means:
- When `showRoleBadges` is `true` (Discovery Mode): starts at index 0 (first card)
- When `showRoleBadges` is `false` (Analysis Mode) with 3+ slides: starts at index 1 (middle card)

The conditional prevents Discovery Mode from starting on the middle card.

## Solution
Change the logic so the carousel **always** starts on the middle card (index 1) when there are 3 or more slides, regardless of mode.

## Implementation

**File:** `src/components/results/ShoeCarousel.tsx`

**Change:** Update line 48-49 from:

```tsx
// Start on first card (index 0) for Shopping Mode with many cards, or center for 3-card Analysis Mode
const initialSlideIndex = showRoleBadges ? 0 : (totalSlides >= 3 ? 1 : 0);
```

To:

```tsx
// Always start on middle card (index 1) when there are 3+ slides
const initialSlideIndex = totalSlides >= 3 ? 1 : 0;
```

## Result
- 3 shoes: loads on card 2 (middle)
- 2 shoes: loads on card 1 (first)
- 1 shoe: no carousel, just displays the single card

This ensures users always see the middle recommendation first, with the ability to swipe left or right to see alternatives.
