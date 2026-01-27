

# Update Action Button Labels & Styling

## Overview
Change button labels from "Shortlist" to "SAVE" and "Buy now" to "BUY", match button curvature to the card, and equalise spacing.

---

## Changes

**File:** `src/components/results/ShoeCard.tsx`

### 1. Update Button Labels

| Current | New |
|---------|-----|
| Shortlist | Save |
| Buy now | Buy |

### 2. Match Button Curvature to Card

The card uses `rounded-2xl` (16px radius). Change buttons from `rounded-full` to `rounded-xl` (12px) for a more harmonious look that echoes the card's corners.

### 3. Equalise Spacing

Current positioning:
- Top: `top-3` (12px)
- Left/Right: `left-4` / `right-4` (16px)

Change to equal spacing:
- Top: `top-4` (16px)
- Left/Right: `left-4` / `right-4` (16px)

This creates consistent 16px inset from all edges.

---

## Technical Details

**SAVE button (lines 254, 280):**
```text
Current: "absolute top-3 left-4 ... rounded-full"
Change to: "absolute top-4 left-4 ... rounded-xl"

Current text: "Shortlist"
Change to: "Save"
```

**BUY button (lines 294, 302):**
```text
Current: "absolute top-3 right-4 ... rounded-full"
Change to: "absolute top-4 right-4 ... rounded-xl"

Current text: "Buy now"
Change to: "Buy"
```

---

## Visual Result

| Element | Before | After |
|---------|--------|-------|
| Save button text | Shortlist | Save |
| Buy button text | Buy now | Buy |
| Button radius | rounded-full (9999px) | rounded-xl (12px) |
| Top spacing | 12px (top-3) | 16px (top-4) |
| Side spacing | 16px (left-4/right-4) | 16px (unchanged) |

The buttons will now have consistent 16px spacing from all edges and a softer corner radius that complements the card's `rounded-2xl` styling.

