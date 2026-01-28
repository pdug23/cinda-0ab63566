
# Simplify Archetype Tooltip Content

## Overview

Replace the cluttered badge-based tooltip with clean, sentence-case text that clearly communicates:
1. What Cinda recommends this shoe as (the selected archetype)
2. What other archetypes the shoe works for (if any)
3. What run types those archetypes are suited for

---

## Current State

The tooltip currently shows:
- Inline badge components (DAILY, WORKOUT) styled with background colours
- Mixed casing and awkward sentence flow
- Visually busy and hard to read

---

## Proposed Format

**Single archetype:**
> Cinda recommends this shoe as a workout shoe.

**Multiple archetypes:**
> Cinda recommends this shoe as a workout shoe.
>
> This shoe is also considered a daily trainer, meaning it's good for recovery runs and long runs at a comfortable pace.

---

## Technical Changes

### File: `src/components/results/ShoeCard.tsx`

**1. Remove the `ArchetypeBadge` component** (lines 131-142)
- Delete the entire component as it will no longer be used

**2. Update `buildArchetypePopoverContent` function** (lines 145-169)

Replace with cleaner text-only implementation:

```text
Single archetype case:
- "Cinda recommends this shoe as a [archetype label] [noun]."

Multiple archetypes case:
- "Cinda recommends this shoe as a [primary archetype label] [noun]."
- Followed by a new paragraph:
- "This shoe is also considered a [secondary archetype(s)], meaning it's good for [run types]."
```

**3. Update archetype labels for sentence case**

The existing `archetypeLabels` object already uses lowercase, which works for sentence case. Combine with nouns to form:
- "daily trainer"
- "recovery shoe"  
- "workout shoe"
- "race shoe"
- "trail shoe"

---

## Implementation Detail

```text
const buildArchetypePopoverContent = (archetypes: string[]) => {
  if (!archetypes || archetypes.length === 0) return null;
  
  const primary = archetypes[0];
  const secondary = archetypes.slice(1);
  
  // Get full archetype name (e.g., "workout shoe", "daily trainer")
  const getFullArchetypeName = (arch: string) => {
    const label = archetypeLabels[arch] || arch;
    const noun = archetypeNoun[arch] || "shoe";
    return `${label} ${noun}`;
  };
  
  if (secondary.length === 0) {
    return (
      <p>Cinda recommends this shoe as a {getFullArchetypeName(primary)}.</p>
    );
  } else {
    // Build secondary archetypes list
    const secondaryNames = secondary.map(a => getFullArchetypeName(a));
    const secondaryList = secondaryNames.join(" and ");
    const secondaryRunTypes = secondary.map(a => archetypeRunTypes[a]).join(" and ");
    
    return (
      <>
        <p>Cinda recommends this shoe as a {getFullArchetypeName(primary)}.</p>
        <p>This shoe is also considered a {secondaryList}, meaning it's good for {secondaryRunTypes}.</p>
      </>
    );
  }
};
```

---

## Styling

- Remove badge styling entirely
- Use consistent `text-sm text-white/80 leading-relaxed` for all text
- Add `space-y-2` wrapper for proper paragraph spacing when multiple paragraphs exist
- Sentence case throughout (capital C for "Cinda", otherwise lowercase)

---

## Summary of Changes

| Line Range | Change |
|------------|--------|
| 131-142 | Delete `ArchetypeBadge` component |
| 145-169 | Replace `buildArchetypePopoverContent` with clean text version |

**Files to edit:** `src/components/results/ShoeCard.tsx`
