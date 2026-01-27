

## Plan: Restore the Animated Background

### What Happened

When I moved the nebula background from `body` to `html` to fix the iOS grey bar issue, I inadvertently covered up the **AnimatedBackground** component. 

Here's the conflict:
- **AnimatedBackground component** (the "lovely" one): Has slow-moving animated gradients with a 20-second drift cycle, animated grain overlay, and vignette. Uses `fixed inset-0` with negative z-indexes (`-z-30`, `-z-20`, `-z-10`).
- **CSS on `html`**: A static gradient that now paints on the root element, which sits behind even the AnimatedBackground's fixed layers.

The result: the static CSS gradient is showing instead of the animated one.

### The Fix

Remove the static nebula gradient from the `html` element in CSS, keeping only a solid base color. This allows the AnimatedBackground component to show through as the visible background.

### Changes

**File: `src/index.css` (lines 161-167)**

```css
/* Before - static gradient covering the AnimatedBackground */
html {
  background: 
    var(--gradient-nebula-overlay),
    var(--gradient-warm);
  background-color: hsl(0 0% 12%);
  background-attachment: fixed;
}

/* After - solid base color only, lets AnimatedBackground show */
html {
  background-color: #1e1e1e;
}
```

### Why This Fixes Both Issues

1. **Animated background returns**: The AnimatedBackground component's fixed layers will be visible again since there's no gradient on `html` covering them.

2. **iOS grey bar stays fixed**: The solid `#1e1e1e` on `html` matches the `theme-color` meta tag and manifest colors, so any safe-area region iOS reveals will blend seamlessly with the dark base of the animated background.

### Summary

| Element | Before | After |
|---------|--------|-------|
| `html` background | Static nebula gradient | Solid `#1e1e1e` |
| AnimatedBackground | Covered by CSS | Visible and animated |
| iOS safe-area | Matches dark base | Still matches dark base |

