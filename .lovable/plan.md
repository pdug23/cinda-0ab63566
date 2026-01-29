
# Add Subtle Emphasis to BUY Button

## Current State

The BUY button currently has:
- Dark translucent background (`rgba(26, 26, 30, 0.95)`)
- Subtle white border (15% opacity)
- Muted white text and icon (70% opacity)
- No glow or accent color

This makes it blend in with the SAVE button, lacking visual hierarchy.

---

## Proposed Solution

Add subtle enhancements that draw attention without overwhelming the design:

1. **Subtle orange glow** - A soft box-shadow using the primary color at low opacity
2. **Slightly brighter text** - Increase text/icon opacity from 70% to 85%
3. **Orange-tinted border** - Replace white border with a very subtle orange tint

---

## Changes

### File: `src/components/results/ShoeCard.tsx`

**Lines 292-303**

```tsx
<button
  className="absolute top-4 right-4 h-8 px-2.5 flex items-center justify-center gap-1 rounded-xl transition-all z-10"
  style={{
    backgroundColor: "rgba(26, 26, 30, 0.95)",
    border: "1px solid hsl(var(--primary) / 0.25)",
    boxShadow: "0 0 8px hsl(var(--primary) / 0.3)",
  }}
  onClick={() => setBuyModalOpen(true)}
  aria-label="Buy now"
>
  <span className="text-[10px] font-medium uppercase tracking-wide text-white/85">Buy</span>
  <ExternalLink className="w-3.5 h-3.5 text-white/85" />
</button>
```

---

## Visual Comparison

```text
BEFORE:
┌─────────────────────────────────────┐
│  [SAVE]                     [BUY]  │  ← Both buttons identical (dark, muted)
└─────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────┐
│  [SAVE]                    [✨BUY]  │  ← BUY has subtle orange glow halo
└─────────────────────────────────────┘
```

---

## Design Details

| Property | Current | Proposed |
|----------|---------|----------|
| Background | Dark translucent | Dark translucent (unchanged) |
| Border | White 15% | Orange 25% (subtle tint) |
| Text/Icon | White 70% | White 85% (slightly brighter) |
| Glow | None | Orange glow at 30% opacity |

---

## Why This Works

- **Maintains dark aesthetic** - Background stays the same dark color
- **Subtle differentiation** - The soft glow creates a "halo" effect without screaming for attention
- **Brand consistency** - Uses the orange accent color already established in the app
- **Not overwhelming** - Low opacity values (25-30%) keep it refined

---

## File Summary

| File | Change |
|------|--------|
| `src/components/results/ShoeCard.tsx` | Add subtle orange glow, orange-tinted border, and slightly brighter text to BUY button |
