
# Add Super Trainer Badge to Shoe Cards

## Overview

Display a "SUPER TRAINER" badge on shoe cards when the shoe is a super trainer. Super trainers are versatile shoes that can handle everything from easy recovery runs through hard workouts - a valuable distinguishing feature worth highlighting.

## Current State

- `is_super_trainer` exists in `shoebase.json` for each shoe
- The backend uses this flag for coverage logic and bullet point generation
- However, `is_super_trainer` is NOT currently passed to the frontend in the `RecommendedShoe` type
- The frontend `ShoeCard` component has no awareness of this property

## Solution

Two-step implementation:

1. **Backend**: Add `is_super_trainer` to the `RecommendedShoe` type and the builder function
2. **Frontend**: Add the badge display logic to `ShoeCard.tsx`

## Changes

### 1. Update API Types

**File: `api/types.ts`**

Add `is_super_trainer` to the `RecommendedShoe` interface (around line 634):

```typescript
// Archetype badges (which types this shoe is)
archetypes: ShoeArchetype[];
is_super_trainer: boolean;  // NEW: Flag for super trainer versatility badge
```

### 2. Update Recommendation Engine

**File: `api/lib/recommendationEngine.ts`**

Add `is_super_trainer` to the returned object in `buildRecommendedShoe` (around line 866):

```typescript
archetypes: getShoeArchetypes(shoe),
is_super_trainer: shoe.is_super_trainer,  // NEW
badge,
position,
```

### 3. Update ShoeCard Props

**File: `src/components/results/ShoeCard.tsx`**

Add `is_super_trainer` to the shoe prop type (around line 35):

```typescript
use_trail?: boolean;
retail_price_category?: 'Budget' | 'Core' | 'Premium' | 'Race_Day';
is_super_trainer?: boolean;  // NEW
```

### 4. Add Badge Display

**File: `src/components/results/ShoeCard.tsx`**

Add a new badge in the badges section (around line 409, before the match badge):

```tsx
{shoe.is_super_trainer && (
  <span
    className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md font-medium"
    style={{
      backgroundColor: "rgba(168, 85, 247, 0.15)",  // Purple tint
      border: "1px solid rgba(168, 85, 247, 0.4)",
      color: "#A855F7",  // Purple (Tailwind purple-500)
      letterSpacing: "0.5px",
      boxShadow: "0 0 8px rgba(168, 85, 247, 0.2)",
    }}
  >
    Super Trainer
  </span>
)}
```

## Color Choice

Using **purple (#A855F7)** for the Super Trainer badge because:
- Distinct from existing badge colors (blue for matches, orange for trade-offs, gray for archetypes)
- Conveys premium/special status
- Good visibility on dark card background
- Matches the "elite versatility" positioning of super trainers

## Visual Result

| Badge | Color | Purpose |
|-------|-------|---------|
| DAILY / WORKOUT etc. | Gray (#94a3b8) | Archetype category |
| SUPER TRAINER | Purple (#A855F7) | Versatility highlight |
| CLOSEST MATCH | Blue (#3B82F6) | Match tier |
| CLOSE MATCH | Light blue (#93C5FD) | Match tier |
| TRADE-OFF | Orange (#F97316) | Match tier |

## Files to Edit

| File | Change |
|------|--------|
| `api/types.ts` | Add `is_super_trainer: boolean` to `RecommendedShoe` interface |
| `api/lib/recommendationEngine.ts` | Include `is_super_trainer` in `buildRecommendedShoe` return object |
| `src/components/results/ShoeCard.tsx` | Add prop type and render Super Trainer badge |

## Complexity

Low - straightforward data plumbing and UI addition following existing patterns.
