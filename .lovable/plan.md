
# Fix iOS PWA Persistent Bottom Bar

## Overview

Force minimal document-level scrollability (1px) in iOS standalone PWA mode so that Safari merges the safe-area into the webview, allowing backgrounds to paint under the home indicator.

---

## Root Cause

The `OnboardingLayout` component sets `body.style.overflow = "hidden"` to prevent scrolling. On iOS PWAs in standalone mode, when the document has zero scrollability, Safari reserves the bottom safe-area as a system-controlled non-DOM region. This region cannot be styled by CSS — neither `body::after` shims nor fixed backgrounds can paint there.

The 1px scroll trick creates minimal document scrollability, which tells iOS the webview "owns" the safe-area region.

---

## Technical Changes

### File: `src/index.css`

Add a standalone-mode-specific rule that creates 1px of document scrollability:

```css
/* iOS PWA standalone mode: force minimal document scroll to claim safe-area */
@media all and (display-mode: standalone) {
  html, body {
    overflow-y: auto !important;
  }
  
  body::before {
    content: "";
    display: block;
    height: 1px;
  }
}
```

**Placement**: After the existing `body::after` shim (around line 206)

**Why `!important`**: The `OnboardingLayout` component dynamically sets `body.style.overflow = "hidden"` via JavaScript. The `!important` ensures CSS takes precedence, but only in standalone mode.

---

## What This Does

1. **Creates 1px of scrollable content** via `body::before` pseudo-element
2. **Ensures document allows scrolling** with `overflow-y: auto`
3. **Only applies in PWA standalone mode** — no effect on regular Safari or other browsers
4. **Works with existing scroll lock** — the 1px shim doesn't create visible scrolling, and inner containers still scroll normally

---

## No Changes Needed

| File | Status |
|------|--------|
| `OnboardingLayout.tsx` | Keep as-is — scroll lock still works for inner content |
| `AnimatedBackground.tsx` | Already correctly using `width/height: 100%` |
| `body::after` shim | Keep as-is — will now paint correctly once iOS merges safe-area |
| `manifest.json` | Already has correct `background_color` |

---

## Summary

| File | Change |
|------|--------|
| `src/index.css` | Add `@media (display-mode: standalone)` rule with 1px body::before and overflow-y: auto |

---

## Testing Steps

1. Clear Safari cache
2. Remove existing Cinda app from home screen
3. Re-add to home screen via Share → Add to Home Screen
4. Open from home screen icon (standalone mode)
5. Verify: no grey bar at bottom on any page
6. Verify: rubber-banding/pull-to-refresh doesn't reveal different colours
7. Test on iPhone with notch and iPhone SE (no notch)
