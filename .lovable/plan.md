
# Make BUY Button More Visible on Shoe Cards

## Overview

Enhance the BUY button to stand out as the primary call-to-action on shoe cards, drawing the user's eye while maintaining the premium dark aesthetic.

---

## Proposed Approach

Transform the BUY button from a subtle, muted style to an eye-catching design using the app's orange accent color (the primary brand color). This creates visual hierarchy where BUY is clearly the main action, while SAVE remains secondary.

---

## Changes

### File: `src/components/results/ShoeCard.tsx`

**Current styling (lines 292-303):**
- Dark translucent background
- Subtle white border (15% opacity)
- Muted white text (70% opacity)
- Blends into the card background

**New styling:**
- Orange/primary accent background with glow effect
- Brighter text (full white or near-white)
- Subtle pulse/glow animation to draw attention
- Slightly larger touch target

```tsx
// Updated BUY button
<button
  className="absolute top-4 right-4 h-8 px-3 flex items-center justify-center gap-1.5 rounded-xl transition-all z-10 group"
  style={{
    background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)",
    border: "1px solid hsl(var(--primary) / 0.6)",
    boxShadow: "0 0 12px hsl(var(--primary) / 0.4), 0 2px 8px rgba(0,0,0,0.3)",
  }}
  onClick={() => setBuyModalOpen(true)}
  aria-label="Buy now"
>
  <span className="text-[10px] font-semibold uppercase tracking-wide text-white">Buy</span>
  <ExternalLink className="w-3.5 h-3.5 text-white" />
</button>
```

---

## Visual Comparison

```text
BEFORE:
┌─────────────────────────────────────┐
│  [SAVE]                     [BUY]  │  ← Both buttons look the same (dark, muted)
│         ...card content...         │
└─────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────┐
│  [SAVE]                    [🧡BUY]  │  ← BUY stands out with orange glow
│         ...card content...         │
└─────────────────────────────────────┘
```

---

## Design Details

| Property | SAVE Button (unchanged) | BUY Button (new) |
|----------|-------------------------|------------------|
| Background | Dark translucent | Orange gradient with glow |
| Border | Subtle white (15%) | Orange accent (60%) |
| Text | Muted white (70%) | Pure white |
| Font weight | Medium | Semi-bold |
| Shadow | None | Orange glow + drop shadow |
| Padding | px-2.5 | px-3 (slightly wider) |

---

## Technical Notes

- Uses `hsl(var(--primary))` to match the app's orange accent color
- Gradient gives depth and premium feel
- Box-shadow creates the eye-catching glow effect
- Maintains the rounded-xl corners to match card styling
- `group` class allows for future hover state enhancements

---

## File Summary

| File | Change |
|------|--------|
| `src/components/results/ShoeCard.tsx` | Update BUY button styling with orange gradient, glow effect, and brighter text |
