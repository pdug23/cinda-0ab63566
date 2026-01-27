

## Plan: Fix CTA Buttons Layout on Mobile

### The Problem

The "FULL ANALYSIS" and "QUICK MATCH" buttons are currently stacked vertically on mobile (using `flex-col sm:flex-row`). This causes the buttons to overlap with the steps list above them, as shown in the screenshot.

### The Solution

Change the button layout to always be side-by-side (even on mobile) and make them taller but narrower.

---

### Changes to `src/pages/Landing.tsx`

**Line 185**: Reduce horizontal padding to give buttons more room
```tsx
// Before
className={`absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xs px-6 ...

// After
className={`absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 ...
```

**Line 189**: Change from stacked to always side-by-side
```tsx
// Before
<div className="flex flex-col sm:flex-row gap-4 w-full">

// After
<div className="flex flex-row gap-3 w-full">
```

**Lines 191-198 & 201-208**: Make buttons taller to compensate for narrower width
```tsx
// Before (both buttons)
className="w-full min-h-[44px] text-xs uppercase ..."

// After (both buttons)  
className="w-full min-h-[52px] text-xs uppercase ..."
```

---

### Summary

| Change | Before | After |
|--------|--------|-------|
| Layout | `flex-col sm:flex-row` (stacked on mobile) | `flex-row` (always side-by-side) |
| Button gap | `gap-4` | `gap-3` (slightly tighter) |
| Container padding | `px-6` | `px-4` (more room for buttons) |
| Button height | `min-h-[44px]` | `min-h-[52px]` (taller for tap target) |

### Result

The buttons will always display side-by-side, each taking 50% width. The taller height compensates for the narrower width and maintains good tap targets. The reduced padding and gap give the buttons more horizontal space to fit their text.

