
# Fix Glow Clipping and Add Pagination Dots

## Overview

Two issues need to be addressed on the Recommendations page:

1. **Glow Clipping**: The card's glowing border effect is being cut off by overflow constraints, creating a visible "edge" where the glow stops abruptly
2. **Missing Pagination Indicator**: Users have no visual indication of how many cards exist or which one is currently active

---

## Issue 1: Glow Effect Being Clipped

### Root Cause

The `OnboardingLayout` component uses `overflow-x-hidden` even when `allowOverflow` is true (line 69):

```typescript
className={`fixed inset-0 ${allowOverflow ? 'overflow-x-hidden overflow-y-visible' : 'overflow-hidden'}`}
```

This horizontally clips the glow effect from the shoe cards. Additionally, the inner container div also uses the same conditional overflow logic.

### Solution

When `allowOverflow` is true AND `invisible` is true (which is the case for the Recommendations page), remove all overflow restrictions to allow the glow to bleed naturally into the background.

**Changes to OnboardingLayout.tsx:**
- When both `invisible` and `allowOverflow` are true, use `overflow-visible` on both the outer container and inner card div
- This allows the animated glow from ShoeCard to extend beyond the card boundaries without hitting a clipping edge

---

## Issue 2: Adding Pagination Dots

### Solution

Add a simple pagination indicator below the carousel showing dots for each card. The active card's dot will be filled in.

**Visual Design:**
```
     ●  ○  ○     (first card active)
     ○  ●  ○     (second card active)  
     ○  ○  ●     (third card active)
```

- Dots are subtle and match the existing muted color palette
- Active dot uses the theme's foreground color
- Inactive dots use a muted/transparent variant
- Spacing between dots is minimal for a clean look

**Changes to ShoeCarousel.tsx:**
- Add pagination dots container below the Swiper component
- Use the existing `activeIndex` state to determine which dot is filled
- Style dots consistently with the dark aesthetic

---

## File Changes

| File | Change |
|------|--------|
| `src/components/OnboardingLayout.tsx` | Fix overflow handling when `invisible` + `allowOverflow` are both true |
| `src/components/results/ShoeCarousel.tsx` | Add pagination dots indicator below carousel |

---

## Technical Details

### OnboardingLayout.tsx Changes

Update line 69 to check for both `invisible` and `allowOverflow`:

```typescript
// Outer container overflow logic
const outerOverflow = (invisible && allowOverflow) 
  ? 'overflow-visible' 
  : allowOverflow 
    ? 'overflow-x-hidden overflow-y-visible' 
    : 'overflow-hidden';

// Inner container overflow logic  
const innerOverflow = (invisible && allowOverflow)
  ? 'overflow-visible'
  : allowOverflow 
    ? 'overflow-x-hidden overflow-y-visible' 
    : 'overflow-hidden';
```

### ShoeCarousel.tsx Changes

Add pagination dots after the Swiper component:

```typescript
{/* Pagination Dots */}
{totalSlides > 1 && (
  <div className="flex justify-center items-center gap-2 mt-4">
    {recommendations.map((_, index) => (
      <button
        key={index}
        onClick={() => swiperRef.current?.slideTo(index)}
        className={cn(
          "w-2 h-2 rounded-full transition-all duration-200",
          index === activeIndex 
            ? "bg-white/80 scale-110" 
            : "bg-white/30 hover:bg-white/50"
        )}
        aria-label={`Go to slide ${index + 1}`}
      />
    ))}
  </div>
)}
```

The dots are:
- Interactive (clicking navigates to that slide)
- Visually distinct between active and inactive states
- Consistent with the dark aesthetic using white with varying opacity
- Accessible with proper aria-labels

---

## Expected Result

After these changes:
1. The glow effect from shoe cards will extend smoothly into the background without any visible clipping edge
2. Users will see pagination dots at the bottom of the carousel, clearly indicating the number of cards and which one is currently displayed
