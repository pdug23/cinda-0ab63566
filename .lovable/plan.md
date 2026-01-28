
# Fix Shoe Cards Not Rendering in Carousel

## Root Cause

The carousel height changes made earlier are conflicting with the flex layout structure on the Recommendations page. Specifically:

1. The carousel is wrapped in: `flex-1 flex items-center min-h-0 overflow-visible`
2. `min-h-0` allows the flex container to shrink below its content size
3. The explicit heights I added (`height: '560px'`) on both Swiper and slide containers don't work well with this flex structure
4. The result is the Swiper container collapses because flex height isn't propagating correctly

**Before my changes:** The cards worked because Swiper sized naturally based on its children (ShoeCard has `height: 560px`).

**After my changes:** Explicit heights on Swiper create conflicts with `flex-1 min-h-0` which can collapse.

---

## Solution

Revert the height changes to ShoeCarousel and instead ensure the parent containers properly size themselves. The key insight is:

1. **Remove explicit heights from Swiper** - Let it size based on content
2. **Keep the slide container with `h-full`** - Original behavior
3. **Add `min-h-[580px]` to the outer wrapper** - Ensures minimum space
4. **Keep the pagination dots** - They work fine

---

## Changes to `src/components/results/ShoeCarousel.tsx`

### Line 118: Keep minHeight on outer container (optional, but safe)
```tsx
<div className="shoe-carousel w-full py-2 flex flex-col" style={{ minHeight: '580px' }}>
```

### Line 129: Remove `style={{ height: '560px' }}` from Swiper
```tsx
// Before
<Swiper style={{ height: '560px' }} ...>

// After  
<Swiper ...>  // Remove the style prop entirely
```

### Line 165: Revert slide container back to `h-full`
```tsx
// Before
<div className="flex justify-center items-center" style={{ height: '560px' }}>

// After
<div className="flex justify-center h-full">
```

---

## Also: Fix Pagination Dot Colors

Per the original spec, change back to muted white:

### Lines 189-191:
```tsx
// Before
index === activeIndex 
  ? "bg-primary scale-110" 
  : "bg-card-foreground/40 hover:bg-card-foreground/60"

// After
index === activeIndex 
  ? "bg-foreground/80 scale-110" 
  : "bg-foreground/30 hover:bg-foreground/50"
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line 129 | Remove `style={{ height: '560px' }}` from `<Swiper>` |
| Line 165 | Change `style={{ height: '560px' }}` back to `h-full` |
| Lines 189-191 | Revert pagination dot colors to muted white |

---

## Why This Fixes It

- The ShoeCard already has a fixed `height: 560px` (line 244 in ShoeCard.tsx)
- When Swiper has no explicit height, it sizes based on its children (the ShoeCards)
- The `h-full` on the slide container allows it to fill available space
- The `minHeight: 580px` on the outer wrapper ensures the carousel area never fully collapses
- This matches the working behavior before the glow/dots changes

---

## What Stays

- Pagination dots (the new feature) - just with corrected colors
- Overflow visible settings in OnboardingLayout - for glow effects
- The `minHeight: 580px` on the outer carousel div - as a safety net
