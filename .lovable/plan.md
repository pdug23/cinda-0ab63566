
# Fix Archetype Tooltip Logic

## Overview

Fix two issues with the archetype badge tooltip:
1. The primary archetype in the tooltip doesn't match the recommended archetype
2. The info icon and tooltip should only appear when a shoe has multiple archetypes

---

## Problem Analysis

**Current behaviour:**

The tooltip uses `archetypes[0]` as the primary archetype, but this is just the first archetype in the shoe's capability list, not the archetype it's being recommended for.

For example, the Mach 6:
- Being recommended as: `WORKOUT` (shown as `shoe.archetype` or `shoe.role`)
- `archetypes` array: `["daily_trainer", "workout_shoe"]` 
- Tooltip incorrectly says: "Cinda recommends this shoe as a daily trainer"

**Correct behaviour:**

- Use `shoe.archetype` or `shoe.role` as the primary (what Cinda is recommending it for)
- Secondary archetypes = all other archetypes from the `archetypes` array that aren't the primary
- Only show the info icon if the shoe has additional archetypes beyond the primary

---

## Technical Changes

### File: `src/components/results/ShoeCard.tsx`

**1. Update `buildArchetypePopoverContent` function signature**

Change it to accept both the recommended archetype and the full archetypes list:

```text
const buildArchetypePopoverContent = (recommendedArchetype: string, allArchetypes: string[])
```

**2. Fix the logic inside `buildArchetypePopoverContent`**

- Use `recommendedArchetype` as the primary
- Filter out the recommended archetype from `allArchetypes` to get secondary archetypes
- Only show the second paragraph if there are secondary archetypes

**3. Update the badge rendering logic**

Only render the role badge with info icon if:
- `showRoleBadge` is true
- `roleBadgeLabel` exists
- The shoe has more than one archetype (i.e., there are secondary archetypes to explain)

If a shoe only has one archetype, just show the badge without the info icon and without the popover.

---

## Updated Code Structure

```text
// Determine what archetypes to work with
const recommendedArchetype = shoe.archetype || shoe.role || "daily_trainer";
const allArchetypes = shoe.archetypes || [recommendedArchetype];

// Get secondary archetypes (excluding the recommended one)
const secondaryArchetypes = allArchetypes.filter(a => a !== recommendedArchetype);
const hasMultipleArchetypes = secondaryArchetypes.length > 0;

// Badge rendering:
if (hasMultipleArchetypes) {
  // Show badge with (i) icon and popover
} else {
  // Show badge without (i) icon, no popover
}
```

---

## Updated Tooltip Content

**Single archetype (no tooltip needed):**

No tooltip - just the badge label.

**Multiple archetypes:**

> Cinda recommends this shoe as a [recommended archetype].
>
> This shoe is also considered a [other archetypes list], meaning it's good for [run types].

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Lines 131-169 | Update `buildArchetypePopoverContent` to accept `recommendedArchetype` and `allArchetypes` parameters, use recommended archetype as primary |
| Lines 332-358 | Add logic to only show info icon and popover when shoe has multiple archetypes; show plain badge otherwise |

**File to edit:** `src/components/results/ShoeCard.tsx`
