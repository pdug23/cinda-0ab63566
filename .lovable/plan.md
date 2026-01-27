

## Plan: Fix iOS Grey Bar AND Restore Animation

### Two Problems to Fix

1. **Animation disappeared**: The recent fix added `background-color: hsl(0 0% 12%)` to `html`, which obscures the `AnimatedBackground` component (it uses negative z-indices, placing it behind the opaque html background)

2. **Grey bar at home indicator**: The AnimatedBackground layers use `fixed inset-0` which doesn't extend into the iOS safe area (home indicator region)

---

### Technical Changes

#### 1. Restore Animation Visibility

**File: `src/index.css`**

Make the `body` background transparent so the AnimatedBackground shows through:

```css
/* BEFORE */
html {
  background-color: hsl(0 0% 12%);
  min-height: 100%;
}

body {
  background-image: ...gradients...;
  background-color: hsl(0 0% 12%);
}

/* AFTER */
html {
  background-color: hsl(0 0% 12%);  /* Keep as fallback for iOS canvas */
  min-height: 100%;
}

body {
  background: transparent;  /* Remove body background so AnimatedBackground shows */
  /* Remove the gradient variables - AnimatedBackground handles the visuals */
}
```

The `html` background remains as a safety net (prevents system grey), but `body` becomes transparent so the `AnimatedBackground` component is visible again.

---

#### 2. Fix Grey Bar at Home Indicator

**File: `src/components/AnimatedBackground.tsx`**

Extend all three animated layers to cover the iOS safe area:

```tsx
// Current (line ~25): Animated gradient layer
<div
  className="fixed inset-0 pointer-events-none -z-30"
  style={{
    background: `...gradients...`,
    // ...
  }}
/>

// Updated: Extend into safe area
<div
  className="fixed pointer-events-none -z-30"
  style={{
    top: 0,
    left: 0,
    right: 0,
    bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
    background: `...gradients...`,
    // ...rest of existing styles
  }}
/>
```

Apply the same change to all three layers:
- Animated gradient layer (line ~25)
- Animated grain overlay (line ~40)  
- Vignette overlay (line ~52)

---

### Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `src/index.css` | Set `body { background: transparent; }` | Restore animation visibility |
| `src/components/AnimatedBackground.tsx` | Add `bottom: calc(-1 * env(safe-area-inset-bottom))` to all 3 layers | Cover home indicator region |

---

### Why This Works

1. **Animation restored**: With `body` transparent, the AnimatedBackground's negative z-index layers become visible again (they're behind `body` but `body` is now see-through)

2. **Grey bar fixed**: The `calc(-1 * env(safe-area-inset-bottom))` extends each layer beyond the safe area boundary into the home indicator zone

3. **iOS fallback preserved**: The `html` element keeps its solid background color as a last-resort canvas for any edge cases

---

### Verification Checklist

- Animated gradient drifts visibly (20s cycle)
- Grain texture is subtly visible
- No grey bar at home indicator region
- Works in Safari browser and installed PWA
- No grey flash during rubber-band scroll

