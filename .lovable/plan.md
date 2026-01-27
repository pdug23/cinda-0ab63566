

# Reduce Spacing Between Shoe Image and Bullets

## Overview
Tighten the vertical spacing between the shoe image and the bullet points section to create a more compact, balanced layout.

---

## Current Spacing Analysis

| Element | Current Class | Spacing |
|---------|--------------|---------|
| Image container | `py-3` | 12px top + 12px bottom = 24px |
| Divider | `my-3` | 12px top + 12px bottom = 24px |
| **Total gap** | | ~36px between image and bullets |

---

## Proposed Changes

**File:** `src/components/results/ShoeCard.tsx`

### 1. Reduce Image Container Bottom Padding

Change the image container from `py-3` to `pt-3 pb-1` to reduce bottom padding:

```text
Line 375:
Current: className="flex justify-center items-center py-3"
New:     className="flex justify-center items-center pt-3 pb-1"
```

### 2. Reduce Divider Top Margin

Change the divider from `my-3` to `mt-1 mb-3` to reduce top margin:

```text
Line 384:
Current: className="h-px my-3"
New:     className="h-px mt-1 mb-3"
```

---

## Visual Result

| Element | Before | After |
|---------|--------|-------|
| Image bottom padding | 12px | 4px |
| Divider top margin | 12px | 4px |
| Divider bottom margin | 12px | 12px (unchanged) |
| **Total gap** | ~36px | ~20px |

This will bring the bullet points closer to the shoe image while maintaining appropriate breathing room.

