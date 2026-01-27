

## Plan: Fix CTA Buttons to Be Side-by-Side on Mobile

### The Problem

The "FULL ANALYSIS" and "QUICK MATCH" buttons are currently stacked vertically on mobile because of `flex-col sm:flex-row` on line 191. This causes layout issues where text may be clipped or the buttons take too much vertical space.

### The Solution

Change the button layout to always be side-by-side and make them taller to compensate for the reduced width. This gives each button enough height for a good tap target while fitting both on one row.

---

### Changes to `src/pages/Landing.tsx`

**Line 187**: Reduce horizontal padding to give buttons more room
```tsx
// Before
className={`absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xs px-6 ...

// After  
className={`absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 ...
```

**Line 191**: Change from stacked to always side-by-side with tighter gap
```tsx
// Before
<div className="flex flex-col sm:flex-row gap-4 w-full">

// After
<div className="flex flex-row gap-3 w-full">
```

**Lines 196 & 206**: Make buttons taller to compensate for narrower width
```tsx
// Before (both buttons)
className="w-full min-h-[44px] text-xs uppercase ..."

// After (both buttons)
className="w-full min-h-[56px] text-xs uppercase ..."
```

---

### Summary of Changes

| Change | Before | After |
|--------|--------|-------|
| Layout | `flex-col sm:flex-row` (stacked on mobile) | `flex-row` (always side-by-side) |
| Button gap | `gap-4` | `gap-3` (tighter) |
| Container padding | `px-6` | `px-4` (more room for buttons) |
| Button height | `min-h-[44px]` | `min-h-[56px]` (taller for tap target) |

### Result

Both buttons will always display side-by-side, each taking 50% width. The increased height (56px vs 44px) compensates for the narrower width and maintains excellent tap targets. The reduced padding and gap give the buttons more horizontal space to comfortably fit their text.

