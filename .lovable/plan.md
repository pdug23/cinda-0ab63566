
# Remove Side Borders Clipping Adjacent Card Peeks

## Problem

The horizontal padding (`px-4 md:px-6`) on the `OnboardingLayout`'s main element creates visible borders on both sides of the display. These paddings clip the "peek" preview of adjacent shoe cards, defeating the purpose of the carousel's `slidesPerView` values (1.2-1.45).

## Solution

When `OnboardingLayout` is in `invisible` mode (used on the Recommendations page), remove the horizontal padding from the main element so the carousel can extend edge-to-edge. This allows the adjacent card peeks to be visible without being clipped.

---

## Changes

### File: `src/components/OnboardingLayout.tsx`

**Current code (line 75):**
```tsx
<main className="h-full flex flex-col items-center justify-center px-4 md:px-6">
```

**Updated code:**
```tsx
<main className={`h-full flex flex-col items-center justify-center ${invisible ? '' : 'px-4 md:px-6'}`}>
```

This conditionally removes the horizontal padding when `invisible={true}`, allowing the ShoeCarousel to extend to the edges of the screen while the card peeks remain visible.

---

## Visual Impact

```text
BEFORE (with padding):
┌──────────────────────────────────────────────┐
│ ░░ │  peek  │     Active Card     │  peek  │ ░░ │  ← padding clips peeks
└──────────────────────────────────────────────┘

AFTER (no padding in invisible mode):
┌──────────────────────────────────────────────┐
│  peek  │        Active Card        │  peek  │  ← full edge-to-edge
└──────────────────────────────────────────────┘
```

---

## File Summary

| File | Change |
|------|--------|
| `src/components/OnboardingLayout.tsx` | Remove horizontal padding when `invisible={true}` |
