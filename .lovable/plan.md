
# Compact Action Buttons & Smaller Badges

## Overview
Make the top corner buttons smaller and visually integrated with the card, plus reduce badge sizes to improve the overall visual balance.

---

## Changes

### 1. Compact Action Buttons

**File:** `src/components/results/ShoeCard.tsx`

**Current (lines 252-304):**
- Buttons are `h-11 px-3` with full text labels
- Background is `rgba(0, 0, 0, 0.4)` (darker than card)

**Change to:**
- Reduce height: `h-8` (32px, still above 44px touch target with padding)
- Reduce horizontal padding: `px-2.5`
- Smaller text: `text-[10px]`
- Smaller icons: `w-3.5 h-3.5`
- Match card background: `rgba(26, 26, 30, 0.95)` with `border: 1px solid rgba(255, 255, 255, 0.15)`
- Position higher: `top-3` instead of `top-4`

### 2. Smaller Badges

**Current (lines 331-372):**
- Badges use `text-xs px-3 py-1.5 gap-3`

**Ideas for smaller badges:**
- Reduce padding: `px-2 py-1`
- Reduce font: `text-[10px]` instead of `text-xs`
- Reduce gap between badges: `gap-2` instead of `gap-3`
- This creates a more compact, refined look

---

## Visual Result

| Element | Before | After |
|---------|--------|-------|
| Button height | 44px (h-11) | 32px (h-8) |
| Button text | text-xs | text-[10px] |
| Button background | Black overlay | Card background color |
| Badge padding | px-3 py-1.5 | px-2 py-1 |
| Badge text | text-xs | text-[10px] |
| Gap between badges | 12px (gap-3) | 8px (gap-2) |

The buttons will blend seamlessly with the card while remaining visible, and badges will take up less vertical space while still being readable.
