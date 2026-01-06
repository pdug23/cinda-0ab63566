# Cinda Backend Architecture

## Overview

The Cinda backend consists of 4 core modules that work together to analyze a runner's shoe rotation and generate personalized recommendations.

```
Profile + Current Shoes
        ↓
1. rotationAnalyzer.ts  → RotationAnalysis
        ↓
2. gapDetector.ts       → Gap (single most important)
        ↓
3. shoeRetrieval.ts     → Candidates (20-30 shoes)
        ↓
4. recommendationEngine.ts → 3 Recommendations
```

## Module Responsibilities

### 1. types.ts
**Purpose:** All TypeScript type definitions

**Key Types:**
- `RunnerProfile` - User data from quiz
- `CurrentShoe` - Shoes in current rotation
- `RotationAnalysis` - Coverage, gaps, redundancies
- `Gap` - Single most important gap
- `RecommendedShoe` - Final recommendation with reasoning
- `Shoe` - Catalogue shoe (matches shoebase.json)

**Location:** `/api/types.ts`

---

### 2. shoeRetrieval.ts
**Purpose:** Filter and score 72-shoe catalogue to return 20-30 candidates

**Main Function:**
```typescript
getCandidates(constraints, catalogue): Shoe[]
```

**Scoring System (0-100 points):**
- Role matching: 0-40 points
- Feel preferences: 0-30 points
- Stability bonus: 0-15 points
- Availability: 0-15 points

**Key Features:**
- Hard filters (trail/road separation, brand, exclusions)
- Soft scoring (closer match = higher score)
- Constraint relaxation if <15 candidates
- Returns top 30 by score

**Location:** `/api/lib/shoeRetrieval.ts`

---

### 3. rotationAnalyzer.ts
**Purpose:** Analyze current rotation to identify coverage, gaps, and redundancies

**Main Function:**
```typescript
analyzeRotation(currentShoes, profile, catalogue): RotationAnalysis
```

**What It Identifies:**
1. **Covered Roles** - What they currently have
2. **Missing Roles** - What they need (based on profile)
3. **Redundancies** - 2+ similar shoes serving same role
4. **Quality Signals:**
   - All shoes liked
   - Has disliked shoes
   - Has shoes near replacement

**Expected Roles by Profile:**
- `infrequent` → daily
- `mostly_easy` → daily, easy
- `structured_training` → daily, easy, tempo
- `workouts` → daily, tempo, intervals
- `long_run_focus` → daily, long

**Location:** `/api/lib/rotationAnalyzer.ts`

---

### 4. gapDetector.ts
**Purpose:** Identify THE SINGLE most important gap to address

**Main Function:**
```typescript
identifyPrimaryGap(analysis, profile, currentShoes, catalogue): Gap
```

**Gap Types (in priority order):**

1. **Coverage Gap** (Highest Priority)
   - Missing critical role (tempo for race training)
   - High/medium/low severity

2. **Performance Gap**
   - Needs faster shoes for pace/racing goals
   - Only if profile indicates performance focus

3. **Recovery Gap**
   - Needs cushioning/protection for volume
   - Relevant for structured training/high mileage

4. **Redundancy Gap** (Lowest Priority)
   - Multiple similar shoes, other needs uncovered
   - Only if BOTH redundancy + missing roles exist

**Prioritization:**
- Always checks coverage first
- Returns immediately on high-severity coverage gap
- Returns single Gap (never a list)

**Location:** `/api/lib/gapDetector.ts`

---

### 5. recommendationEngine.ts
**Purpose:** Generate exactly 3 shoe recommendations that address the gap

**Main Function:**
```typescript
generateRecommendations(gap, profile, currentShoes, catalogue): RecommendedShoe[]
```

**Recommendation Pattern (Always 3):**
1. **Close Match 1** - Best fit for the gap
2. **Close Match 2** - Similar to #1, slight variation
3. **Trade-off Option** - Different approach with clear compromise

**Logic Flow:**
1. Build constraints from gap type
2. Get candidates via shoeRetrieval
3. Score candidates for gap-specific fit (+0-50 bonus)
4. Select 3 diverse shoes
5. Generate explanations (matchReason, keyStrengths, tradeOffs)
6. Validate all exist in catalogue

**Gap-Specific Bonuses:**
- Coverage: +20 for role match, +10 for versatility
- Performance: +15 for plate, +15 for light weight
- Recovery: +20 for max cushion, +10 for stability

**Diversity Criteria:**
- Close matches: Similar brand OR similar feel
- Trade-off: Different brand OR different cushion/weight/plate

**Location:** `/api/lib/recommendationEngine.ts`

---

## Data Flow Example

### Scenario: Beginner runner training for first 10K

**Input:**
```typescript
profile = {
  experience: "beginner",
  primaryGoal: "train_for_race",
  runningPattern: "structured_training",
  feelPreferences: { softVsFirm: 4, stableVsNeutral: 3, bouncyVsDamped: 3 }
}

currentShoes = [
  { shoeId: "shoe_0001", roles: ["daily", "easy"], sentiment: "like" }
]
```

**Step 1: rotationAnalyzer**
```typescript
analysis = {
  coveredRoles: ["daily", "easy"],
  missingRoles: ["tempo"],
  redundancies: [],
  allShoesLiked: true,
  hasDislikedShoes: false,
  hasNearReplacementShoes: false
}
```

**Step 2: gapDetector**
```typescript
gap = {
  type: "coverage",
  severity: "high",
  reasoning: "You're training for a race but don't have a shoe for tempo workouts...",
  missingCapability: "tempo"
}
```

**Step 3: shoeRetrieval**
```typescript
candidates = getCandidates(
  { roles: ["tempo"], feelPreferences: {...}, excludeShoeIds: ["shoe_0001"] },
  catalogue
)
// Returns ~25 tempo-capable shoes
```

**Step 4: recommendationEngine**
```typescript
recommendations = [
  {
    fullName: "Nike Pegasus 41",
    recommendationType: "close_match",
    matchReason: "Responsive trainer with firm foam for efficient tempo efforts",
    keyStrengths: ["Firm, responsive platform", "Versatile across 3+ run types"],
    tradeOffs: undefined
  },
  {
    fullName: "ASICS Gel Cumulus 26",
    recommendationType: "close_match_2",
    matchReason: "Responsive trainer with firm foam for efficient tempo efforts",
    keyStrengths: ["Energetic, bouncy foam", "Lightweight (280g)"],
    tradeOffs: undefined
  },
  {
    fullName: "Nike Vaporfly 3",
    recommendationType: "trade_off_option",
    matchReason: "Plated shoe for faster-paced training and workouts",
    keyStrengths: ["ZoomX + carbon plate adds snap", "Lightweight (215g)"],
    tradeOffs: "Premium price point"
  }
]
```

---

## Critical Design Principles

### 1. No Hallucinations
- All shoes validated against catalogue by `shoe_id`
- Never generate placeholder names
- Fail explicitly if can't find 3 shoes

### 2. Single Responsibility
- Each module has one clear job
- Pure functions where possible
- Composable pipeline

### 3. Gap-Driven
- Identify ONE primary gap (not a list)
- Recommendations specifically address that gap
- Clear prioritization hierarchy

### 4. Trail/Road Separation
- Never mix trail and road shoes
- Enforced at retrieval level
- Critical for safety and performance

### 5. Aligned Scales
- Feel preference scales match shoebase.json (5=soft, 1=firm)
- Allows direct comparison without inversion
- Documented in types.ts

### 6. Graceful Degradation
- Constraint relaxation if too few candidates
- Fallback to sensible defaults
- Clear error messages

---

## Testing

### Validation Tests Created:
- `/api/test/simpleTest.mjs` - Shoebase.json data validation
- `/api/test/testRotationAnalyzer.mjs` - Expected roles logic
- `/api/test/testGapDetector.mjs` - Gap prioritization

### Run Tests:
```bash
# Data validation
node api/test/simpleTest.mjs

# Logic validation
node api/test/testRotationAnalyzer.mjs
node api/test/testGapDetector.mjs

# TypeScript compilation
npx tsc --noEmit api/types.ts
npx tsc --noEmit api/lib/*.ts
```

---

## Integration Points

### Frontend → Backend
```typescript
// POST /api/analyze
{
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  intent: "add" | "replace"
}
```

### Backend → Frontend
```typescript
{
  success: true,
  result: {
    gap: Gap,
    recommendations: [RecommendedShoe, RecommendedShoe, RecommendedShoe],
    summaryReasoning: string
  }
}
```

### Chat Context
Frontend sends gap + recommendations to `/api/chat` for conversational explanation.

---

## Future Enhancements (Do Not Implement)

- Add rocker/ground_feel preferences to profile
- Consider price constraints
- Multi-shoe recommendations (e.g., "replace 2 shoes")
- Historical rotation tracking
- Seasonal recommendations (summer vs winter)

---

## File Structure

```
/api/
├── types.ts                    # All TypeScript types (428 lines)
├── lib/
│   ├── shoeRetrieval.ts       # Filter + score catalogue (371 lines)
│   ├── rotationAnalyzer.ts    # Analyze current rotation (337 lines)
│   ├── gapDetector.ts         # Identify primary gap (390 lines)
│   ├── recommendationEngine.ts # Generate 3 recommendations (530 lines)
│   └── README_*.md            # Module documentation
└── test/
    ├── simpleTest.mjs         # Data validation
    ├── testRotationAnalyzer.mjs
    └── testGapDetector.mjs

/src/data/
└── shoebase.json              # 72-shoe catalogue (source of truth)
```

---

## Quick Reference

**Get candidates for tempo shoes:**
```typescript
import { getCandidates } from './lib/shoeRetrieval';
const candidates = getCandidates({ roles: ['tempo'] }, catalogue);
```

**Analyze rotation:**
```typescript
import { analyzeRotation } from './lib/rotationAnalyzer';
const analysis = analyzeRotation(currentShoes, profile, catalogue);
```

**Identify gap:**
```typescript
import { identifyPrimaryGap } from './lib/gapDetector';
const gap = identifyPrimaryGap(analysis, profile, currentShoes, catalogue);
```

**Generate recommendations:**
```typescript
import { generateRecommendations } from './lib/recommendationEngine';
const recs = generateRecommendations(gap, profile, currentShoes, catalogue);
```

---

## Success Criteria

✅ **All modules implemented**
✅ **TypeScript compiles with no errors**
✅ **Validation tests pass**
✅ **No shoe hallucinations**
✅ **Always returns exactly 3 recommendations**
✅ **Gap prioritization makes intuitive sense**
✅ **Trail/road separation enforced**
✅ **Feel scales aligned with shoebase.json**
