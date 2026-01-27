

# Remove "Cinda's recommendations" Heading & Increase Card Height

## Overview
Remove the "Cinda's recommendations" heading that wastes vertical space, and use the reclaimed space to make the shoe cards taller and more impactful.

---

## Changes

### 1. Remove PageHeader Component

**File:** `src/pages/Recommendations.tsx`

Delete the `PageHeader` component definition (lines 229-237) since it will no longer be used.

Remove the `<PageHeader />` calls:
- Line 702 (Analysis mode)
- Line 728 (Discovery mode)

### 2. Increase Shoe Card Height

**File:** `src/components/results/ShoeCard.tsx`

Change the fixed height from `520px` to `560px` to use the reclaimed vertical space:

```text
Current (line 245):
  height: "520px",

Change to:
  height: "560px",
```

---

## Result

| Before | After |
|--------|-------|
| Header taking ~40px | Removed |
| Card height: 520px | Card height: 560px |
| Heading feels redundant | Clean, focused layout |

The shoe cards will now feel more substantial and dominant on the screen, with the brand logo and shoe information being the primary focus immediately after the navigation buttons.

