

# Fix Disappeared Shoe Cards and Pagination Dot Colors

## Problem Analysis

After reviewing the code, I identified two issues:

### Issue 1: Invisible Shoe Cards

The shoe carousel container structure is:
```
flex-1 flex items-center min-h-0 overflow-visible
  └─ w-full overflow-visible
       └─ ShoeCarousel (flex flex-col py-2)
            └─ Swiper
                 └─ SwiperSlide
                      └─ ShoeCard (560px height)
```

The problem is that the `flex-1 min-h-0` pattern combined with Swiper not having explicit heights causes the carousel to collapse. The cards exist but have no visible height in the layout because:
- `min-h-0` allows the flex child to shrink below content size
- Swiper doesn't propagate height from its children automatically
- The slides render with 0 computed height

### Issue 2: Wrong Pagination Dot Color

The pagination dots currently use:
- Active: `bg-foreground/80` (80% white on dark theme)
- Inactive: `bg-foreground/30` (30% white on dark theme)

These appear very muted against the dark nebula background. They should match the visual aesthetic (e.g., orange accent or brighter white).

---

## Solution

### 1. Fix Card Height (ShoeCarousel.tsx)

Add explicit height to the Swiper wrapper container and ensure the slides have height:

```tsx
// ShoeCarousel wrapper
<div className="shoe-carousel w-full py-2 flex flex-col" style={{ height: '580px' }}>
  <Swiper
    style={{ height: '100%' }}
    // ... rest of props
  >
```

Also update the SwiperSlide inner container to have full height:

```tsx
<SwiperSlide>
  <div className="flex justify-center h-full items-center">
    <ShoeCard ... />
  </div>
</SwiperSlide>
```

### 2. Fix Pagination Dot Colors (ShoeCarousel.tsx)

Update the dots to use the primary accent color (orange) for active state:

```tsx
<button
  className={cn(
    "w-2 h-2 rounded-full transition-all duration-200",
    index === activeIndex 
      ? "bg-primary scale-110"  // Orange for active
      : "bg-card-foreground/40 hover:bg-card-foreground/60"  // Muted for inactive
  )}
/>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/results/ShoeCarousel.tsx` | Add explicit height to carousel container and Swiper; fix pagination dot colors |

---

## Technical Details

### ShoeCarousel.tsx Changes

**Lines ~117-118**: Add height styling to the outer container:
```tsx
<div className="shoe-carousel w-full py-2 flex flex-col" style={{ minHeight: '580px' }}>
```

**Lines ~119-156**: Add height to Swiper:
```tsx
<Swiper
  style={{ height: '560px' }}
  // ... rest of configuration
>
```

**Lines ~163-174**: Ensure slide container has proper height and centering:
```tsx
<SwiperSlide ...>
  <div className="flex justify-center items-center" style={{ height: '560px' }}>
    <ShoeCard ... />
  </div>
</SwiperSlide>
```

**Lines ~186-194**: Update pagination dot colors:
```tsx
<button
  className={cn(
    "w-2 h-2 rounded-full transition-all duration-200",
    index === activeIndex 
      ? "bg-primary scale-110"  // Orange accent
      : "bg-card-foreground/40 hover:bg-card-foreground/60"
  )}
/>
```

