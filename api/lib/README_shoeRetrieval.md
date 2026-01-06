# Shoe Retrieval Module

## Overview

The `shoeRetrieval.ts` module filters and scores the 72-shoe catalogue to return 20-30 candidate shoes based on user constraints and preferences.

## Core Function

```typescript
getCandidates(constraints: RetrievalConstraints, catalogue: Shoe[]): Shoe[]
```

### Parameters

**constraints** - Object with filtering and scoring criteria:
- `roles?: ShoeRole[]` - Desired use cases (daily, easy, long, tempo, intervals, race, trail)
- `stabilityNeed?` - Stability preference:
  - `"neutral"` - No stability preference
  - `"stability"` - Prefer stability shoes (support_type = "stability")
  - `"stable_feel"` - Prefer shoes with high stability feel (stability_1to5 >= 4)
- `feelPreferences?` - Slider values (1-5 scale, matching shoebase.json):
  - `softVsFirm` - 5 = very soft, 1 = very firm
  - `stableVsNeutral` - 5 = very stable, 1 = neutral
  - `bouncyVsDamped` - 5 = very bouncy, 1 = damped
- `excludeShoeIds?: string[]` - Shoe IDs to exclude (current rotation)
- `brandOnly?: string` - Limit to specific brand (case-insensitive)

**catalogue** - Array of all shoes from shoebase.json

### Returns

Array of 20-30 shoes sorted by match quality (best first)

## Usage Examples

### Example 1: Daily Trainer Search

```typescript
import { getCandidates } from './lib/shoeRetrieval';
import shoebaseData from '../src/data/shoebase.json';

const candidates = getCandidates(
  { roles: ['daily'] },
  shoebaseData
);

// Returns ~30 best daily trainers
```

### Example 2: Trail Shoes with Stability

```typescript
const candidates = getCandidates(
  {
    roles: ['trail'],
    stabilityNeed: 'stable_feel',
  },
  shoebaseData
);

// Returns trail shoes with high stability scores
```

### Example 3: Easy Run Shoes - Soft & Damped

```typescript
const candidates = getCandidates(
  {
    roles: ['easy', 'long'],
    feelPreferences: {
      softVsFirm: 5,      // Very soft
      stableVsNeutral: 2, // Stable feel
      bouncyVsDamped: 4,  // Damped/smooth
    },
  },
  shoebaseData
);

// Returns soft, cushioned shoes for easy miles
```

### Example 4: Nike Tempo Shoes (Exclude Current Rotation)

```typescript
const candidates = getCandidates(
  {
    roles: ['tempo'],
    brandOnly: 'Nike',
    excludeShoeIds: ['shoe_0001', 'shoe_0002'], // Already own these
  },
  shoebaseData
);

// Returns Nike tempo shoes not in current rotation
```

## Scoring System

Each shoe receives a score (0-100) based on:

### Role Matching (0-40 points)
- daily: 10 points
- easy: 8 points
- long: 10 points
- tempo: 12 points
- intervals: 10 points
- race: 8 points
- trail: 15 points

Multiple roles can accumulate (capped at 40)

### Feel Preference Matching (0-30 points)
- Each feel dimension (soft/firm, stable/neutral, bouncy/damped) scored separately
- Formula: `10 - abs(shoe_score - preference) * 2`
- Perfect match = 10 points per dimension (max 30 total)

### Stability Bonus (0-15 points)
- Stability shoe when requested: +15
- High stability feel when requested: +10

### Availability Bonus (0-15 points)
- Available: +15
- Coming soon: +10
- Regional: +5
- Discontinued: 0

## Hard Filters

These constraints are strictly enforced:

1. **Trail vs Road Separation** - Never mixes trail and road shoes
2. **Brand Filter** - Only returns specified brand if brandOnly set
3. **Exclusion List** - Never returns shoes in excludeShoeIds
4. **Availability** - Prioritizes available shoes

## Constraint Relaxation

If initial filters return fewer than 15 candidates, constraints are relaxed in this order:

1. Remove brand filter
2. Expand to related roles (daily ↔ easy ↔ long, tempo ↔ intervals)
3. Remove feel preferences (keep stability needs)

If still too few (<5), returns fallback: top 10 daily trainers.

## Utility Functions

### getScoreBreakdown

```typescript
getScoreBreakdown(shoe: Shoe, constraints: RetrievalConstraints): ScoredShoe
```

Returns detailed scoring breakdown for debugging:

```typescript
{
  shoe: Shoe,
  score: 87,
  breakdown: {
    roleScore: 30,
    feelScore: 24,
    stabilityBonus: 15,
    availabilityBonus: 15,
  }
}
```

### wouldPassFilters

```typescript
wouldPassFilters(shoe: Shoe, constraints: RetrievalConstraints): boolean
```

Validates if a shoe passes hard filters (useful for testing).

## Data Requirements

### From shoebase.json

Each shoe must have:
- `shoe_id` - Unique identifier
- `use_*` booleans (use_daily, use_trail, etc.)
- Feel scores (cushion_softness_1to5, bounce_1to5, stability_1to5)
- `support_type` - neutral/stable_neutral/stability/max_stability
- `release_status` - available/coming_soon/regional/discontinued
- `brand` - Brand name
- `weight_g` - Weight in grams

## Testing

The module has been validated with:
- 72 shoes in catalogue
- 42 daily trainers
- 10 trail shoes
- 15 race shoes

See `api/test/simpleTest.mjs` for data validation.

## Integration

This module is used by:
1. **rotationAnalyzer.ts** - To find gaps in current rotation
2. **recommendationEngine.ts** - To get final 3 shoe recommendations
3. **API endpoints** - To serve candidate lists to frontend

## Design Principles

1. **Pure functions** - No side effects, testable
2. **Graceful degradation** - Always returns something useful
3. **Trail/road separation** - Never compromises on surface type
4. **Score transparency** - Scoring logic is documented and intuitive
5. **Performance** - Filters then scores (not score then filter)
