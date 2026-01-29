
# Update Match Badge Color Scheme

## Problem

The "CLOSE MATCH" badge uses a platinum white color (`#F1F5F9`) which causes the model name shimmer animation to be invisible, making the card look "sad" compared to the others.

## Solution

Update the color scheme to use a two-tone blue system:

| Badge Type | Current Color | New Color | Description |
|------------|---------------|-----------|-------------|
| CLOSEST MATCH | `#7DD3FC` (light cyan) | `#3B82F6` (deeper blue) | A richer, more saturated blue |
| CLOSE MATCH | `#F1F5F9` (white) | `#93C5FD` (light sky blue) | Lighter blue, similar to old CLOSEST but slightly lighter |
| TRADE-OFF | `#F97316` (orange) | `#F97316` (unchanged) | Stays the same |

## Visual Hierarchy

```text
CLOSEST MATCH  →  Deep/rich blue (#3B82F6)     ← Most prominent, saturated
CLOSE MATCH    →  Light sky blue (#93C5FD)     ← Softer, lighter blue
TRADE-OFF      →  Orange (#F97316)             ← Unchanged, distinct category
```

Both blues will be visibly different: CLOSEST is darker/richer, CLOSE is lighter/softer. The shimmer effect will now work for CLOSE MATCH since it's a visible color rather than near-white.

## Changes

### File: `src/components/results/ShoeCard.tsx`

**Lines 66-79** - Update the `getBadgeConfig` function:

```tsx
const getBadgeConfig = (
  type: ShoeCardProps["shoe"]["recommendationType"],
  badge?: ShoeCardProps["shoe"]["badge"]
): { text: string; color: string } => {
  const effectiveType = badge || type;
  
  if (effectiveType === "closest_match") {
    return { text: "CLOSEST MATCH", color: "#3B82F6" }; // Rich/deep blue
  }
  if (effectiveType === "trade_off_option" || effectiveType === "trade_off") {
    return { text: "TRADE-OFF", color: "#F97316" }; // Orange (unchanged)
  }
  return { text: "CLOSE MATCH", color: "#93C5FD" }; // Light sky blue
};
```

## Technical Notes

- The color change propagates to: badge styling, card glow animation, checkmark icons, and the model name shimmer effect
- `#3B82F6` is Tailwind's `blue-500` - a rich, saturated blue that feels premium
- `#93C5FD` is Tailwind's `blue-300` - a soft, light blue that complements the deeper tone
- Both blues are distinct enough to be clearly differentiated while belonging to the same family

## Files to Edit

| File | Change |
|------|--------|
| `src/components/results/ShoeCard.tsx` | Update color values in `getBadgeConfig` function |
