
# Fix Landing Page Tagline Animation

## Problem
The tagline "Every runner deserves to find their perfect fit." currently animates with a staggered effect where each line fades in 200ms after the previous one. The user wants all lines to appear simultaneously.

## Solution
Remove the `transitionDelay` style property from the span elements in `AnimatedTagline.tsx` so all four lines animate together when `shouldAnimate` becomes true.

---

## File Changes

| File | Change |
|------|--------|
| `src/components/AnimatedTagline.tsx` | Remove `transitionDelay` from span style |

---

## Technical Details

**Current code (line 62-63):**
```typescript
style={{ 
  transitionDelay: `${i * 200}ms`,
  fontSize: "clamp(28px, 8vw, 40px)",
  ...
}}
```

**Updated code:**
```typescript
style={{ 
  fontSize: "clamp(28px, 8vw, 40px)",
  fontWeight: 900,
  fontStyle: "italic",
  WebkitTextStroke: "0.5px currentColor"
}}
```

This removes the staggered delay while keeping the smooth fade-in and translate-up animation for all lines happening at the same time. The `subtle-shimmer` ripple animation that starts after the fade-in will continue to work as expected.
