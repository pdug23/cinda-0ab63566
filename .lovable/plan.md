
## Fix: iOS Safari/PWA Grey Bar at Home Indicator Region

### Root Cause Analysis

The grey bar appears **only in Safari and iOS PWA** (both use WebKit) because:

1. The `AnimatedBackground` layers use `calc(-1 * env(safe-area-inset-bottom))` to extend into the safe area
2. WebKit has inconsistent behavior with negative positioning on fixed elements extending beyond safe areas
3. When the extension fails, the `html` element's background (`hsl(0 0% 12%)` - a grey-ish color) shows through in the home indicator region
4. Chrome/Edge use Blink which handles this differently, plus they have their own browser UI that covers this area

### Solution Strategy

Rather than fighting WebKit's safe area handling, we'll use a **two-pronged approach**:

1. **Match the fallback color**: Ensure `html`, `body`, `theme-color`, and `manifest.json` all use the same dark base color as the AnimatedBackground's gradient endpoint
2. **Add legacy iOS fallback**: Include `constant()` fallback for older iOS versions
3. **Use height extension instead of negative bottom**: Extend height to `calc(100% + env(safe-area-inset-bottom))` which is more reliable in WebKit

---

### Technical Changes

#### File: `src/components/AnimatedBackground.tsx`

Change the positioning strategy from negative bottom to explicit height extension:

```tsx
// Current approach (unreliable in WebKit)
style={{
  top: 0,
  left: 0,
  right: 0,
  bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
  ...
}}

// New approach (more reliable)
style={{
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  // Extend height to cover safe area
  height: "calc(100% + constant(safe-area-inset-bottom))",  // iOS < 11.2
  height: "calc(100% + env(safe-area-inset-bottom, 0px))",  // iOS >= 11.2
  ...
}}
```

Apply this to all three layers (gradient, grain, vignette).

---

#### File: `src/index.css`

Update the html/body backgrounds to use the **exact same color** as the AnimatedBackground's darkest gradient point (`hsl(0 0% 10%)`):

```css
/* Explicit html background - matches AnimatedBackground base */
html {
  background-color: hsl(0, 0%, 10%);  /* Matches gradient endpoint */
  min-height: 100%;
}
```

Also update the `body::before` grain overlay to extend into safe areas:

```css
body::before {
  ...
  height: 100%;
  height: calc(100% + constant(safe-area-inset-bottom));
  height: calc(100% + env(safe-area-inset-bottom, 0px));
  ...
}
```

---

#### File: `index.html`

Update the theme-color to match:

```html
<meta name="theme-color" content="#1a1a1a" />
<!-- #1a1a1a = hsl(0 0% 10%) -->
```

---

#### File: `public/manifest.json`

Update colors to match:

```json
{
  "background_color": "#1a1a1a",
  "theme_color": "#1a1a1a"
}
```

---

### Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `src/components/AnimatedBackground.tsx` | Use `height: calc(100% + env())` instead of negative `bottom` | More reliable WebKit extension |
| `src/components/AnimatedBackground.tsx` | Add `constant()` fallback for each layer | Support iOS less than 11.2 |
| `src/index.css` | Change `html` background to `hsl(0, 0%, 10%)` | Match AnimatedBackground's base |
| `src/index.css` | Extend `body::before` height into safe area | Grain covers home indicator |
| `index.html` | Update `theme-color` to `#1a1a1a` | Match PWA status bar color |
| `public/manifest.json` | Update `background_color` and `theme_color` to `#1a1a1a` | Match PWA splash and status bar |

---

### Why This Should Work

1. **Color synchronization**: Even if the AnimatedBackground fails to extend in some edge case, the `html` background is now the same color as the gradient's base, making any gap invisible
2. **Height extension**: Using `height: calc(100% + env())` is a more standard approach that WebKit handles better than negative positioning
3. **Legacy support**: The `constant()` fallback ensures older iOS devices are covered
4. **PWA consistency**: Matching manifest colors ensures the PWA splash and status bar blend seamlessly

---

### Testing Checklist

After implementation:
1. **Safari browser**: Pull down to rubber-band scroll - no visible seam at bottom
2. **iOS PWA**: Delete and re-add to home screen, verify no grey bar at home indicator
3. **Animation visible**: Confirm the gradient still drifts (20s cycle)
4. **Other browsers**: Verify no regression in Chrome/Edge
