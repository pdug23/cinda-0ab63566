

## Plan: Fix Grain Overlay Covering the Container

### Problem

The noise/grain texture is appearing over the main UI container instead of just the background. This is caused by a **duplicate grain implementation** in `src/index.css` that sits on top of everything.

---

### Root Cause

There are two separate grain overlays:

| Location | Type | Z-Index | Opacity |
|----------|------|---------|---------|
| `src/components/AnimatedBackground.tsx` | Animated grain | `z-[1]` | 0.04 |
| `src/index.css` (body::before) | Static grain | `z-index: 3` | 0.06 |

The `body::before` pseudo-element uses `position: fixed` which creates a stacking context that overlays the entire viewport, including the container (even though the container has `z-10`).

---

### Solution

**Remove the duplicate static grain from `src/index.css`**.

The `AnimatedBackground.tsx` already provides a premium animated grain effect that properly sits behind the container. Removing the static duplicate will:
- Fix the overlay issue
- Eliminate code duplication
- Keep the animated grain (which looks better)

---

### Technical Changes

**File:** `src/index.css`

Remove the `body::before` pseudo-element block (approximately lines 35-53):

```css
/* DELETE THIS ENTIRE BLOCK */
body::before {
  content: "";
  position: fixed;
  inset: -100%;
  z-index: 3;
  opacity: 0.06;
  pointer-events: none;
  background-image: url("data:image/svg+xml,...");
}
```

---

### Result

- Grain texture stays on the background only
- Container and all UI elements remain clean and unobstructed
- Single source of truth for the grain effect (AnimatedBackground.tsx)

