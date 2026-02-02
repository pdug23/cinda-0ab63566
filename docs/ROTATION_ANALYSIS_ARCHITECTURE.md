# Rotation Analysis & Gap Detection Architecture

This document explains how Cinda analyzes a runner's shoe rotation and identifies gaps to fill with recommendations.

---

## File Structure

| File | Purpose |
|------|---------|
| `api/lib/rotationAnalyzer.ts` | Analyzes coverage, identifies missing archetypes, detects redundancies, calculates health scores |
| `api/lib/gapDetector.ts` | Identifies the single most important gap to address |
| `api/lib/tierClassifier.ts` | Classifies rotation health into tiers, detects feel gaps, builds recommendation slots |
| `api/analyze.ts` | API endpoint orchestrating the flow: rotation → gaps → recommendations |
| `api/lib/shoeRetrieval.ts` | Scoring engine that applies all modifiers to rank shoes |
| `api/lib/recommendationEngine.ts` | Generates final 3-shoe recommendations from scored candidates |

---

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              /api/analyze                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Profile    │    │ CurrentShoes │    │  Catalogue   │                  │
│  │  (goals,     │    │  (shoeId,    │    │  (72 shoes   │                  │
│  │  experience, │    │  runTypes,   │    │  with specs) │                  │
│  │  pattern)    │    │  sentiment)  │    │              │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         └───────────────────┼───────────────────┘                           │
│                             ▼                                               │
│                   ┌─────────────────┐                                       │
│                   │ analyzeRotation │                                       │
│                   │ (coverage,      │                                       │
│                   │  archetypes,    │                                       │
│                   │  redundancies)  │                                       │
│                   └────────┬────────┘                                       │
│                            ▼                                                │
│                   ┌─────────────────┐                                       │
│                   │ calculateHealth │                                       │
│                   │ (coverage,      │                                       │
│                   │  variety,       │                                       │
│                   │  loadResilience,│                                       │
│                   │  goalAlignment) │                                       │
│                   └────────┬────────┘                                       │
│                            ▼                                                │
│         ┌──────────────────┴──────────────────┐                            │
│         ▼                                     ▼                            │
│  ┌──────────────┐                   ┌──────────────────┐                   │
│  │ classifyTier │                   │ identifyPrimary  │                   │
│  │ (Tier 1/2/3, │                   │ Gap (legacy)     │                   │
│  │  feelGaps,   │                   │                  │                   │
│  │  contrast)   │                   │                  │                   │
│  └──────┬───────┘                   └────────┬─────────┘                   │
│         │                                    │                              │
│         └────────────────┬───────────────────┘                              │
│                          ▼                                                  │
│                ┌───────────────────┐                                        │
│                │ RecommendationSlot│                                        │
│                │ {archetype,       │                                        │
│                │  reason,          │                                        │
│                │  feelGap?,        │                                        │
│                │  contrastWith?}   │                                        │
│                └─────────┬─────────┘                                        │
│                          ▼                                                  │
│                ┌───────────────────┐                                        │
│                │ getCandidates     │                                        │
│                │ (hard filters +   │                                        │
│                │  soft scoring)    │                                        │
│                └─────────┬─────────┘                                        │
│                          ▼                                                  │
│                ┌───────────────────┐                                        │
│                │ generateRecs      │                                        │
│                │ (3 diverse shoes) │                                        │
│                └───────────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Rotation Analysis

**File:** `api/lib/rotationAnalyzer.ts`
**Function:** `analyzeRotation(currentShoes, profile, catalogue)`

### What It Does

1. **Identifies covered run types** from user's `currentShoes[].runTypes`
2. **Maps run types to archetypes** using `RUN_TYPE_MAPPING`:
   ```typescript
   RUN_TYPE_MAPPING = {
     "all_runs": ["daily_trainer"],
     "recovery": ["recovery_shoe", "daily_trainer"],
     "long_runs": ["daily_trainer", "workout_shoe", "recovery_shoe"],
     "workouts": ["workout_shoe", "race_shoe"],
     "races": ["race_shoe", "workout_shoe"],
     "trail": ["trail_shoe"]
   }
   ```
3. **Determines expected archetypes** based on profile
4. **Detects redundancies** (similar shoes used for same purpose)

### Expected Archetypes Logic

Based on `profile.runningPattern`:
- `infrequent` → daily_trainer only
- `mostly_easy` → daily_trainer + recovery_shoe
- `structured_training` → daily_trainer + recovery_shoe + workout_shoe
- `workout_focused` → daily_trainer + workout_shoe

Based on `profile.primaryGoal`:
- `race_training` → +workout_shoe, +race_shoe
- `get_faster` → +workout_shoe
- `injury_comeback` → +recovery_shoe

Based on `profile.trailRunning`:
- `most_or_all` or `infrequently` → +trail_shoe

### Output

```typescript
interface RotationAnalysis {
  coveredRunTypes: RunType[];      // What user does
  uncoveredRunTypes: RunType[];    // What user does but lacks coverage for
  coveredArchetypes: ShoeArchetype[];  // What shoe types they have
  missingArchetypes: ShoeArchetype[];  // What shoe types they need
  redundancies: Array<{shoeIds, overlappingRunTypes}>;
  allShoesLoved: boolean;
  hasDislikedShoes: boolean;
  hasNearReplacementShoes: boolean;
}
```

---

## Step 2: Health Scoring

**File:** `api/lib/rotationAnalyzer.ts`
**Function:** `calculateRotationHealth(currentShoes, profile, catalogue)`

### Health Dimensions

| Dimension | Weight | Calculation |
|-----------|--------|-------------|
| `coverage` | 40% | % of expected archetypes that are covered |
| `variety` | 10% | Range across cushion, stability, rocker, drop dimensions |
| `loadResilience` | 20% | Shoe count vs weekly volume needs |
| `goalAlignment` | 30% | Whether rotation supports stated goal |

### Load Resilience Calculation

```typescript
volumeKm < 30  → ideal count = 1
volumeKm < 50  → ideal count = 2
volumeKm < 80  → ideal count = 3
volumeKm >= 80 → ideal count = 4

shortfall = max(0, idealCount - actualCount)
loadResilience = max(0, 100 - (shortfall * 33))
```

### Goal Alignment Calculation

```typescript
race_training:
  - has workout + race → 100
  - has workout OR race → 60
  - neither → 20

get_faster:
  - has workout → 100
  - no workout → 40

injury_comeback:
  - has recovery → 100
  - no recovery → 30

general_fitness:
  - has daily_trainer → 100
  - no daily_trainer → 50
```

### Output

```typescript
interface RotationHealth {
  coverage: number;       // 0-100
  variety: number;        // 0-100
  loadResilience: number; // 0-100
  goalAlignment: number;  // 0-100
  overall: number;        // weighted average
}
```

---

## Step 3: Tier Classification

**File:** `api/lib/tierClassifier.ts`
**Function:** `classifyRotationTier(health, analysis, profile, currentShoes, catalogue)`

### Tier Definitions

| Tier | Confidence | Meaning | Trigger Conditions |
|------|------------|---------|-------------------|
| 1 | High | Genuine gaps | `coverage < 70` OR `goalAlignment < 50` OR `loadResilience < 70` OR missing critical archetype |
| 2 | Medium | Improvements | No plates (intermediate+ doing workouts), low variety, high volume small rotation |
| 3 | Soft | Exploration | Complete rotation, suggest feel variety |

### Critical Archetypes

These archetypes are "critical" based on profile - missing them triggers Tier 1:

```typescript
// Everyone needs:
critical.push("daily_trainer");

// Goal-specific:
race_training → critical.push("workout_shoe", "race_shoe")
get_faster → critical.push("workout_shoe")
injury_comeback → critical.push("recovery_shoe")

// Trail-specific:
trailRunning === "most_or_all" → critical.push("trail_shoe")
```

### Tier 2 Triggers

1. **No plates**: Intermediate+ runner doing workouts but no plated shoe
2. **Low variety**: `health.variety < 30` and multiple shoes
3. **Volume spread**: 70+ km/week with fewer than 3 shoes
4. **Redundancy**: Similar shoes exist AND archetypes are missing

### Tier 3 (Exploration) - Feel Gap Detection

When rotation is complete, detect feel variety gaps:

| Gap | Priority | Trigger | Suggestion |
|-----|----------|---------|------------|
| Max cushion | 1 | No shoe has `cushion_softness_1to5 === 5` | recovery_shoe with cushion=5 |
| High rocker | 2 | No shoe has `rocker_1to5 >= 4` | daily_trainer with rocker |
| Stability | 3 | All shoes have `stability_1to5 <= 2` | daily_trainer with stability |
| Drop | 4 | All drops > 5mm (suggest low) or all < 6mm (suggest high) | daily_trainer |

### Output

```typescript
interface TierClassification {
  tier: 1 | 2 | 3;
  confidence: "high" | "medium" | "soft";
  primary: RecommendationSlot;
  secondary?: RecommendationSlot;
  tierReason: string;
}

interface RecommendationSlot {
  archetype: ShoeArchetype;
  reason: string;
  feelGap?: FeelGapInfo;      // For Tier 3 - target feel value
  contrastWith?: ContrastProfile;  // For Tier 3 - favor different shoes
}
```

---

## Step 4: Gap Detection (Legacy)

**File:** `api/lib/gapDetector.ts`
**Function:** `identifyPrimaryGap(analysis, profile, currentShoes, catalogue)`

This is the legacy gap detection system that runs in parallel with tier classification.

### Gap Priority Order

1. **Misuse** (highest) - Using shoes incorrectly
2. **Coverage** - Missing archetype for profile needs
3. **Performance** - Speed goals but no responsive shoes
4. **Recovery** - Structured training but no protective shoes
5. **Redundancy** (lowest) - Similar shoes, missing archetype

### Gap Types

#### Misuse Gap
**Triggers:**
- Race shoe used for `recovery` or `all_runs`
- Recovery-only shoe used for `workouts` or `races`

**Example output:**
```
"Your Vaporfly 3 is a race weapon - using it for all your runs wears it out without benefit."
```

#### Coverage Gap
**Triggers:**
- Profile demands an archetype that isn't covered
- User assigns runTypes to shoes that aren't suitable

**Severity:**
- High: daily_trainer missing, or workout/race shoe missing for speed goals
- Medium: recovery shoe missing for mostly_easy pattern

#### Performance Gap
**Triggers:**
- `primaryGoal` is `get_faster`, `race_training`, or `experience: competitive`
- No `workout_shoe` or `race_shoe` in rotation

#### Recovery Gap
**Triggers:**
- `runningPattern` is `structured_training`, `workout_focused`, `mostly_easy`
- OR `primaryGoal: injury_comeback`
- No recovery_shoe, daily_trainer, or super_trainer

#### Redundancy Gap
**Triggers:**
- Multiple shoes with similar feel (within 1 point on cushion, stability, bounce)
- Used for same run types
- AND there are missing archetypes

### Output

```typescript
interface Gap {
  type: "coverage" | "misuse" | "performance" | "recovery" | "redundancy";
  severity: "low" | "medium" | "high";
  reasoning: string;
  runType?: RunType;
  recommendedArchetype?: ShoeArchetype;
  redundantShoes?: string[];
}
```

---

## Step 5: Scoring Integration

**File:** `api/lib/shoeRetrieval.ts`

### How Gaps Affect Scoring

#### 1. Hard Filter: Archetype Constraint

The `recommendedArchetype` from gap detection becomes a hard filter:

```typescript
// In getCandidates()
constraints.archetypes = [gap.recommendedArchetype];

// Shoes MUST match at least one requested archetype to pass
const matchesAnyArchetype = archetypes.some(archetype => {
  if (shoeHasArchetype(shoe, archetype)) return true;
  // Super trainers can match daily_trainer, workout_shoe, recovery_shoe
  if (shoe.is_super_trainer && archetype !== 'race_shoe' && archetype !== 'trail_shoe') {
    return true;
  }
  return false;
});
```

#### 2. Gap-Specific Scoring Bonuses

In `recommendationEngine.ts` → `scoreForGapFit()`:

| Gap Type | Bonus Condition | Points |
|----------|-----------------|--------|
| Any | Archetype match | +20 |
| Any | Versatile (2+ archetypes) | +10 |
| Performance | Has plate | +15 |
| Performance | Weight < 240g | +15 |
| Performance | Weight < 260g | +10 |
| Performance | Bounce >= 4 | +10 |
| Performance | Bounce >= 3 | +5 |
| Recovery | Cushion = 5 | +20 |
| Recovery | Cushion = 4 | +10 |
| Recovery | Stability >= 4 | +10 |
| Recovery | Stable support type | +10 |

#### 3. Archetype-Specific Preference Bonuses

In `shoeRetrieval.ts` → `scoreArchetypePreferenceBonuses()`:

When user selects "Let Cinda decide" mode:

**Recovery Requests:**
| Condition | Bonus |
|-----------|-------|
| Pure recovery specialist + cushion=5 | +12 |
| Pure recovery specialist (other cushion) | +3 |
| Super trainer | -5 penalty |
| Cushion = 5 (Cinda decides mode) | +8 |
| Cushion = 4 (Cinda decides mode) | +3 |

**Workout Requests:**
| Condition | Bonus |
|-----------|-------|
| Bounce = 5 (Cinda decides mode) | +8 |
| Bounce = 4 (Cinda decides mode) | +3 |

**Race Requests:**
| Condition | Bonus |
|-----------|-------|
| Bounce = 5 (Cinda decides mode) | +8 |
| Bounce = 4 (Cinda decides mode) | +3 |

#### 4. Feel Gap Override (Tier 3)

When a `feelGap` is passed from tier classification:

```typescript
if (feelGap && feelGap.dimension === currentDimension) {
  // Override normal range with specific target
  const distance = Math.abs(shoeValue - feelGap.targetValue);
  return distanceToScore(distance);
  // distance 0: +5, distance 1: -2, distance 2: -5, distance 3+: -10
}
```

#### 5. Contrast Bonus (Tier 3)

When `contrastWith` profile is provided:

```typescript
// For each dimension (cushion, stability, bounce, rocker, groundFeel):
const diff = Math.abs(shoe.value - rotationAverage.value);
if (diff >= 2) bonus += 10;
else if (diff === 1) bonus += 5;
```

---

## Complete Scoring Breakdown

The final score is the sum of all these components:

```typescript
totalScore = Math.max(0,
  archetypeScore +           // 0-50 (archetype match)
  feelScore +                // -75 to +50 (feel dimension matching)
  heelDropScore +            // -30 to +15 (heel drop match)
  stabilityBonus +           // 0-15 (stability need match)
  availabilityBonus +        // 0-15 (in stock bonus)
  superTrainerBonus +        // 0-15 (versatility bonus)
  footStrikeScore +          // -40 to +10 (heel geometry)
  experienceScore +          // -15 to +18 (beginner cushion, etc)
  primaryGoalScore +         // -10 to +12 (goal alignment)
  runningPatternScore +      // 0 to +10 (pattern alignment)
  paceBucketScore +          // -10 to +10 (speed tier)
  bmiScore +                 // -8 to +18 (body weight)
  trailScore +               // -5 to +10 (trail preference)
  loveDislikeScore +         // -15 to +24 (sentiment tags)
  chatContextScore +         // varies (injuries, fit, climate)
  contrastScore +            // 0 to +50 (variety bonus)
  archetypePreferenceBonuses // -5 to +20 (archetype-specific)
);
```

---

## Summary: Gap → Recommendation Flow

| Step | Input | Output | Effect on Recommendations |
|------|-------|--------|---------------------------|
| Rotation Analysis | currentShoes, profile | coveredArchetypes, missingArchetypes | Identifies what's missing |
| Health Scoring | analysis, profile | coverage, variety, loadResilience, goalAlignment | Determines urgency |
| Tier Classification | health, analysis | tier, primary slot, feelGap?, contrastWith? | Sets recommendation framing |
| Gap Detection | analysis, profile | gap type, severity, recommendedArchetype | **Constrains** which archetypes to search |
| Scoring | constraints, shoe | total score | **Ranks** shoes by fit |
| Selection | scored candidates | 3 diverse shoes | Ensures variety in recommendations |

---

## Key Design Decisions

### 1. Two Gap Detection Systems

The codebase has two parallel systems:
- **Legacy:** `identifyPrimaryGap()` - outputs single Gap object
- **New:** `classifyRotationTier()` - outputs TierClassification with feelGap and contrastWith

Both run during `gap_detection` mode. The tier system is richer but the legacy gap is kept for backwards compatibility.

### 2. Super Trainer Coverage

Super trainers (`is_super_trainer: true`) count as covering:
- daily_trainer
- workout_shoe
- recovery_shoe

This is generous coverage that may mask actual gaps.

### 3. No Penalty for Non-Gap Shoes

While gap-filling shoes get bonuses (+20 archetype match, etc.), there's no explicit penalty for shoes that don't address the gap. They simply don't receive the bonuses, making them rank lower naturally.

### 4. Feel Preferences Override

The `feelGap` from tier classification can override the user's "Let Cinda decide" preferences with a specific target value. This allows the system to guide users toward variety even when they haven't expressed a preference.

---

## Testing Recommendations

### Test Coverage Gaps
1. Create profile with `primaryGoal: "race_training"`
2. Add only daily trainers to rotation
3. Expect: Tier 1 with `recommendedArchetype: "workout_shoe"`

### Test Recovery Gap with Bonuses
1. Request recovery_shoe with `cushionAmount.mode: 'cinda_decides'`
2. Expect: Bondi 9 (pure recovery, cushion=5) scores highest
3. Expect: Superblast (super trainer) scores lower due to -5 penalty

### Test Feel Gap (Tier 3)
1. Create complete rotation (daily + recovery + workout)
2. All shoes have cushion 3-4
3. Expect: Tier 3 with `feelGap: {dimension: 'cushion', suggestion: 'high', targetValue: 5}`

### Test Contrast Bonus
1. Complete rotation with all soft cushion (4-5)
2. Expect: Firmer shoes get contrast bonus (+10 if cushion differs by 2+)
