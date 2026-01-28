
# Fix iOS PWA Grey Bar at Bottom

## Overview

Fix the persistent grey bar that appears at the bottom of the screen in iOS PWA standalone mode. The issue is that the animated background and safe-area shim are not properly covering the home indicator region.

---

## Current State Analysis

| Component | Status | Problem |
|-----------|--------|---------|
| Viewport meta tag | Already has `viewport-fit=cover` | None |
| manifest.json | Already has `#1a1a1a` | None |
| CSS variable `--app-bg` | Missing | Hardcoded values scattered |
| `body::after` shim | Exists but uses `z-index: -1` | May paint behind iOS compositing |
| AnimatedBackground | Uses conflicting positioning | `bottom: 0` + extra height calc conflict |

---

## Technical Changes

### File 1: `src/index.css`

**1. Add `--app-bg` CSS variable** (line 17, inside `:root`)

```css
--app-bg: #1a1a1a;
```

**2. Update html/body/#root to use the variable** (lines 164-198)

Replace all hardcoded `hsl(0 0% 10%)` with `var(--app-bg)`.

**3. Fix `body::after` shim** (lines 201-220)

- Move `body::after` outside the media query so it's always present
- Change `z-index` from `-1` to `0` to paint over iOS grey
- Add `body { position: relative; }` to establish stacking context

Updated structure:
```css
body {
  position: relative;
  /* existing styles */
}

body::after {
  content: "";
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: env(safe-area-inset-bottom, 34px);
  background: var(--app-bg);
  pointer-events: none;
  z-index: 0;
}
```

**4. Consolidate root height rules**

Ensure html, body, #root all use consistent `min-height: 100dvh` with `-webkit-fill-available` fallback.

---

### File 2: `src/components/AnimatedBackground.tsx`

**Fix positioning to avoid conflicting properties**

Current code uses:
```tsx
top: 0, left: 0, right: 0, bottom: 0,
height: `calc(100% + var(--safe-area-bottom, 34px))`,
```

This is conflicting - `bottom: 0` anchors the bottom, but then height extends beyond.

**Fix:** Use `inset: 0` and `height: 100%` without the extra calc. The `body::after` shim will handle the safe area.

Alternatively, remove `bottom` and let the `height` calc extend naturally:

```tsx
style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '100%',
  width: '100%',
  // remove bottom: 0 and the height calc
}}
```

For all three layers (gradient, grain, vignette), update to:
```tsx
top: 0,
left: 0,
width: '100%',
height: '100%',
// remove right: 0 and bottom: 0
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/index.css` | Add `--app-bg` variable, use it in html/body/#root, fix body::after to z-index: 0 and always present, add body position: relative |
| `src/components/AnimatedBackground.tsx` | Simplify positioning to use `width: 100%` and `height: 100%` instead of conflicting inset + calc values |

---

## Testing Steps

After changes:
1. Clear Safari cache
2. Remove existing Cinda app from home screen
3. Re-add to home screen via Share → Add to Home Screen
4. Open from home screen icon
5. Verify: no grey bar at bottom, animated background extends under home indicator
