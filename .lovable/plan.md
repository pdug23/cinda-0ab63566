
# Fix: Shoe Card Layout and Spacing on /recommendations

## Overview
This plan addresses several layout issues on the recommendations page to make shoe cards feel more substantial and use vertical space more efficiently, particularly on mobile devices.

---

## Current Issues Identified

| Issue | Current State | Target State |
|-------|---------------|--------------|
| Top gap | Large space between header and card | Minimal gap |
| Bottom gap | Buttons don't extend to safe area | Buttons near bottom with safe area padding |
| Badge to bullets | No separator line | Add horizontal divider |
| Specs to buttons | No separator line | Add horizontal divider |
| Badge spacing | 8px gap, feels cramped | 12px gap |
| Bullet text | line-height: snug (~1.375) | line-height: 1.6 |
| Card height | Fixed 480px | Dynamic, fills ~80-85% of viewport |

---

## Implementation Plan

### 1. Increase Card Height and Use Dynamic Sizing

**File:** `src/components/results/ShoeCard.tsx`

Change from fixed height to flexible height that adapts to container:

```text
Current (line 245-246):
  height: "480px"

Change to:
  height: "100%",
  minHeight: "480px",
  maxHeight: "600px"
```

This allows the card to expand within its container while maintaining reasonable bounds.

---

### 2. Add Separator Line Between Badges and Bullets

**File:** `src/components/results/ShoeCard.tsx`

Add a divider after the badges section (after line 314):

```tsx
{/* Badge(s) */}
<div className="flex justify-center gap-3 mb-2">
  {/* ... badges ... */}
</div>

{/* NEW: Divider after badges */}
<div className="h-px my-3" style={{ backgroundColor: dividerColor }} />

{/* Match Reasons */}
<div className="space-y-1.5 mb-2">
```

---

### 3. Add Separator Line Between Specs and Buttons

**File:** `src/components/results/ShoeCard.tsx`

A divider already exists after specs (line 359-360). Keep it as-is - this is the specs-to-buttons separator.

---

### 4. Increase Badge Horizontal Spacing

**File:** `src/components/results/ShoeCard.tsx`

Change badge container gap from 2 to 3 (8px → 12px):

```text
Current (line 273):
  <div className="flex justify-center gap-2 mb-2">

Change to:
  <div className="flex justify-center gap-3 mb-2">
```

---

### 5. Improve Bullet Text Line Height

**File:** `src/components/results/ShoeCard.tsx`

Change bullet text from `leading-snug` to explicit line-height:

```text
Current (line 329):
  className="text-sm leading-snug"

Change to:
  className="text-sm"
  style={{ color: textColorMuted, lineHeight: "1.6" }}
```

---

### 6. Reduce Top Gap - Adjust Page Header

**File:** `src/pages/Recommendations.tsx`

Reduce padding in PageHeader component:

```text
Current (line 230-231):
  <div className="text-center py-1 px-5">

Change to:
  <div className="text-center py-0 px-5">
```

---

### 7. Reduce Header Padding

**File:** `src/pages/Recommendations.tsx`

Reduce top padding in header:

```text
Current (line 679):
  pt-6 md:pt-8 pb-4

Change to:
  pt-4 md:pt-6 pb-2
```

---

### 8. Extend Card Container to Fill Available Space

**File:** `src/components/results/ShoeCarousel.tsx`

Reduce vertical padding to allow card to use more space:

```text
Current (line 117):
  <div className="shoe-carousel w-full py-6">

Change to:
  <div className="shoe-carousel w-full py-2">
```

For single card mode (line 103):

```text
Current:
  <div className="flex flex-col items-center py-2 px-4">

Change to:
  <div className="flex flex-col items-center py-1 px-4 h-full">
```

---

### 9. Make Card Fill Carousel Container

**File:** `src/components/results/ShoeCarousel.tsx`

Update slide container to fill height (line 163):

```text
Current:
  <div className="flex justify-center">

Change to:
  <div className="flex justify-center h-full">
```

---

### 10. Add Bottom Safe Area Padding to Card Buttons

**File:** `src/components/results/ShoeCard.tsx`

Add safe area padding to the action buttons container:

```text
Current (line 362-363):
  {/* Action Buttons */}
  <div className="flex gap-2 w-full">

Change to:
  {/* Action Buttons */}
  <div 
    className="flex gap-2 w-full"
    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
  >
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/components/results/ShoeCard.tsx` | Dynamic height, add badges separator, increase badge gap, improve bullet line-height, safe area padding on buttons |
| `src/components/results/ShoeCarousel.tsx` | Reduce py-6 to py-2, add h-full to containers |
| `src/pages/Recommendations.tsx` | Reduce header padding (pt-6 → pt-4), reduce PageHeader padding |

---

## Visual Result

```text
┌────────────────────────────────────┐
│ [← TRY AGAIN]         [PROFILE →] │  ← Reduced top padding
├────────────────────────────────────┤
│     Cinda's recommendations        │  ← Minimal gap
├────────────────────────────────────┤
│         [Brand Logo]               │
│       Model Name V1                │
│                                    │
│   [DAILY]  [CLOSEST MATCH]         │  ← 12px gap between badges
│────────────────────────────────────│  ← NEW separator
│   ✓ Bullet point 1 with better     │
│     line height (1.6)              │
│   ✓ Bullet point 2                 │
│   ✓ Bullet point 3                 │
│────────────────────────────────────│  ← Existing separator
│   Weight    Drop    Plate          │
│   balanced  8mm     carbon         │
│────────────────────────────────────│  ← Existing separator
│   [♡ shortlist]  [↗ buy now]       │
│                                    │  ← Safe area padding
└────────────────────────────────────┘
```

---

## Technical Notes

- Card height changes from fixed 480px to flexible 100% with min/max bounds
- All three separator lines use the same `dividerColor` style for consistency
- Safe area inset is handled via CSS `env()` function for iOS compatibility
- Changes respect the existing glow/border effects - no modifications to card styling
- Bullet content remains untouched (LLM-generated)
