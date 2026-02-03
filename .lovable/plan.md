
# Add Floating Jargon to Both Landing Pages

## Overview

Add the floating jargon effect to the initial landing view (page 1) and ensure phrases are unique across both pages.

## Changes Required

### 1. FloatingJargon Component Updates

**File: `src/components/FloatingJargon.tsx`**

Add a prop to control whether the exclusion zone is active:

```tsx
interface FloatingJargonProps {
  freeFloat?: boolean; // When true, terms float anywhere (no exclusion zone)
}
```

**Ensure unique terms (no duplicates):**

Current code randomly picks terms which can cause duplicates:
```tsx
text: JARGON_TERMS[Math.floor(Math.random() * JARGON_TERMS.length)]
```

Change to shuffle and take first N terms:
```tsx
// Shuffle array and take first termCount items
const shuffled = [...JARGON_TERMS].sort(() => Math.random() - 0.5);
const selectedTerms = shuffled.slice(0, termCount);
```

**Disable exclusion zone when `freeFloat` is true:**
- Skip the bounce-off-zone logic in the animation loop
- Terms simply wrap around screen edges

### 2. Landing Page Updates

**File: `src/pages/Landing.tsx`**

Show FloatingJargon on both landing views with different props:

```tsx
{/* Landing page 1: free float, no exclusion zone */}
{viewState === "landing" && !isExiting && <FloatingJargon freeFloat />}

{/* Landing page 2 (orientation): with exclusion zone */}
{(viewState === "orientation" || isExiting) && <FloatingJargon />}
```

## Technical Details

### Unique Term Selection

```tsx
// Inside useEffect initialization
const shuffled = [...JARGON_TERMS].sort(() => Math.random() - 0.5);
const selectedTerms = shuffled.slice(0, termCount);

for (let i = 0; i < termCount; i++) {
  initialTerms.push({
    // ...
    text: selectedTerms[i], // Each term guaranteed unique
    // ...
  });
}
```

### Free Float Mode

When `freeFloat` is true:
- Starting positions can be anywhere on screen (not just edges)
- No bounce logic against exclusion zone
- Terms still wrap around screen edges

```tsx
// In animation loop
if (!freeFloat) {
  // Existing exclusion zone bounce logic
  const wasInZone = isInExclusionZone(term.x, term.y);
  const willBeInZone = isInExclusionZone(newX, newY);
  // ... bounce handling
}
```

## Visual Result

**Landing Page 1 (initial):**
- Floating jargon terms visible everywhere including center
- Adds atmosphere behind the centered tagline
- Lower opacity (already 4-10%) keeps it subtle

**Landing Page 2 (orientation):**
- Same as current - terms avoid the center content area
- Bounce off exclusion zone to frame the orientation steps

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/FloatingJargon.tsx` | Add `freeFloat` prop, implement unique term selection, conditionally skip exclusion zone logic |
| `src/pages/Landing.tsx` | Add FloatingJargon to landing view with `freeFloat` prop |
