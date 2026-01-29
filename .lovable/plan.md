

# Shoe Card Carousel Improvements

## Overview

Enhance the shoe card carousel on `/recommendations` to:
1. Show a peek (~10%) of adjacent cards on either side with a fade effect
2. Make cards slightly narrower but taller to fill vertical space better
3. Add subtle pagination dots at the bottom

---

## Changes

### 1. Adjust ShoeCard Dimensions

**File:** `src/components/results/ShoeCard.tsx`

- Reduce max-width from `90vw` to `80vw` to leave room for adjacent card peeks
- Increase height from `560px` to `600px` to utilize vertical space

```text
Current:  max-w-[90vw] min-w-[320px], height: 560px
Proposed: max-w-[80vw] min-w-[300px], height: 600px
```

---

### 2. Update ShoeCarousel Configuration

**File:** `src/components/results/ShoeCarousel.tsx`

**Swiper breakpoints adjustment:**
- Increase the `slidesPerView` values slightly to ensure more of adjacent cards are visible
- Current: 1.1 → 1.35 depending on screen
- Proposed: 1.2 → 1.4 depending on screen

**Updated breakpoints:**
```typescript
breakpoints={{
  320: {
    slidesPerView: 1.2,
    spaceBetween: 16,
  },
  375: {
    slidesPerView: 1.25,
    spaceBetween: 20,
  },
  640: {
    slidesPerView: 1.35,
    spaceBetween: 28,
  },
  1024: {
    slidesPerView: 1.45,
    spaceBetween: 36,
  },
}}
```

**Add fade effect on non-active slides:**
Update the injected CSS to add opacity fade and slight blur on adjacent slides:

```css
.shoe-carousel .swiper-slide {
  transition: transform 250ms ease-out, opacity 250ms ease-out, filter 250ms ease-out;
  opacity: 0.4;
  transform: scale(0.92);
  filter: blur(1px);
}
.shoe-carousel .swiper-slide-active {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}
```

---

### 3. Add Pagination Dots

**File:** `src/components/results/ShoeCarousel.tsx`

Add a pagination indicator below the Swiper:

```tsx
{/* Pagination Dots */}
<div className="flex justify-center items-center gap-2 mt-4">
  {recommendations.map((_, index) => (
    <button
      key={index}
      onClick={() => swiperRef.current?.slideTo(index)}
      className={cn(
        "w-2 h-2 rounded-full transition-all duration-200",
        index === activeIndex 
          ? "bg-foreground/80" 
          : "bg-foreground/30 hover:bg-foreground/50"
      )}
      aria-label={`Go to slide ${index + 1}`}
    />
  ))}
</div>
```

The dots will be:
- Small (8px diameter)
- White/foreground color
- Filled (solid) for active slide
- Semi-transparent outline style for inactive slides
- Clickable to navigate directly to that card

---

## Visual Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  [BACK]                                              [PROFILE]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌────┐                 ┌────────────────┐                ┌────┐   │
│   │    │ ← faded/blur    │                │  faded/blur →  │    │   │
│   │10% │                 │  Active Card   │                │10% │   │
│   │peek│                 │                │                │peek│   │
│   │    │                 │   (600px H)    │                │    │   │
│   └────┘                 └────────────────┘                └────┘   │
│                                                                      │
│                           ○   ●   ○                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/results/ShoeCard.tsx` | Adjust max-width to 80vw, height to 600px |
| `src/components/results/ShoeCarousel.tsx` | Update Swiper breakpoints, add fade/blur effect on inactive slides, add pagination dots |

---

## Technical Details

### ShoeCard.tsx Changes (lines 240-245)

```typescript
// Before
className={`relative w-full max-w-[90vw] min-w-[320px] rounded-2xl ...`}
style={{
  height: "560px",
}}

// After  
className={`relative w-full max-w-[80vw] min-w-[300px] rounded-2xl ...`}
style={{
  height: "600px",
}}
```

### ShoeCarousel.tsx - Updated CSS injection

```typescript
style.textContent = `
  .shoe-carousel .swiper {
    overflow: visible !important;
  }
  .shoe-carousel .swiper-wrapper {
    overflow: visible !important;
  }
  .shoe-carousel .swiper-slide {
    overflow: visible !important;
    transition: transform 250ms ease-out, opacity 250ms ease-out, filter 250ms ease-out;
    opacity: 0.4;
    transform: scale(0.92);
    filter: blur(1px);
  }
  .shoe-carousel .swiper-slide-active {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
`;
```

### ShoeCarousel.tsx - Pagination dots (after Swiper closing tag)

```tsx
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
            ? "bg-foreground/80" 
            : "bg-foreground/30 hover:bg-foreground/50"
        )}
        aria-label={`Go to slide ${index + 1}`}
      />
    ))}
  </div>
)}
```

This requires importing `cn` from `@/lib/utils` (already available in the project).

