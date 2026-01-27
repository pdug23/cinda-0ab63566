

## Plan: Fix Mobile Tagline Typography

### Problem

The tagline "Every runner deserves to find their perfect fit." displays beautifully on desktop (4 lines, tight grouping) but looks spread out on mobile (7+ lines, one word per line) because:

1. The font size is fixed at 40px regardless of screen width
2. On narrow screens, each word wraps to its own line
3. The italic bold style with 40px is too large for mobile widths

### Visual Comparison

| Desktop (Great) | Mobile (Current - Bad) |
|-----------------|------------------------|
| Every runner | Every |
| deserves | runner |
| to find their | deserves |
| perfect fit. | to find |
| | their |
| | perfect |
| | fit. |

---

### Solution

Use responsive typography that scales with viewport width, ensuring the tagline displays in approximately 4 lines on both desktop and mobile.

**Approach:** Use `clamp()` CSS function for fluid typography that smoothly scales between mobile and desktop sizes.

---

### Technical Changes

**File:** `src/components/AnimatedTagline.tsx`

1. **Change lines array to 4 lines** (matching the desktop visual):
```tsx
const lines = [
  "Every runner",
  "deserves",
  "to find their",
  "perfect fit."
];
```

2. **Use responsive font sizing with clamp()**:
```tsx
// Instead of fixed 40px, use fluid sizing
fontSize: "clamp(28px, 8vw, 40px)"
```

This creates:
- Minimum: 28px (on very small screens)
- Preferred: 8vw (scales with viewport)
- Maximum: 40px (capped on larger screens)

3. **Add `whitespace-nowrap`** to each line span to prevent individual lines from breaking:
```tsx
<span className="block whitespace-nowrap">
  {line}
</span>
```

---

### Result

| Screen | Font Size | Lines |
|--------|-----------|-------|
| Mobile (375px) | ~30px | 4 lines |
| Tablet (768px) | ~40px | 4 lines |
| Desktop (1024px+) | 40px | 4 lines |

The tagline will always display as 4 tight lines, matching the premium desktop aesthetic on all devices.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/AnimatedTagline.tsx` | Update lines array + responsive font sizing |

