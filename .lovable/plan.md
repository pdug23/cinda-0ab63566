

# Reduce Shoe Image Size by 20%

## Overview
Make the shoe placeholder image 20% smaller to save vertical space on the ShoeCard.

---

## Calculation

| Dimension | Current | New (20% smaller) |
|-----------|---------|-------------------|
| Height | 120px | 96px |

---

## Change

**File:** `src/components/results/ShoeCard.tsx`

### Update Image Height Class

```text
Line 377:
Current: className="h-[120px] w-auto max-w-full object-contain"
New:     className="h-[96px] w-auto max-w-full object-contain"
```

---

## Space Savings

This will save approximately **24px** of vertical height, which combined with the earlier spacing adjustments should give you a more compact card layout.

