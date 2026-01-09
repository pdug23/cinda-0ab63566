# Epic 2.5: Profile Builder - COMPLETE ✅

**Completed:** January 2025
**Duration:** ~4 hours of implementation

---

## What Was Built

### Overview
A complete profile builder flow that collects runner information, current shoe rotation, detects gaps in their rotation, and branches into two distinct recommendation paths (Shopping Mode vs Analysis Mode).

---

## Backend (Claude Code)

### Files Created/Modified:

**api/lib/shoeCapabilities.ts** (NEW)
- `getShoeCapabilities(shoe)` - Extracts what a shoe can do from shoebase.json flags
- `detectMisuse(userRoles, capabilities, shoe)` - Detects 6 misuse scenarios
- Returns: capabilities array + misuse level/message

**api/lib/gapDetector.ts** (MODIFIED)
- Removed "daily" from always-critical roles
- Added weekly volume as a modifier (not blocker)
- Volume thresholds: 50km/1 shoe, 70km/2 shoes, 100km/3 shoes
- Volume context appended to gap reasoning, severity boosted when critical

**api/analyze.ts** (MODIFIED)
- Added `rotationSummary` to gap_detection mode response
- Includes shoe capabilities and misuse detection per shoe

**api/types.ts** (MODIFIED)
- Added `MisuseLevel` type
- Added `RotationSummary` interface
- Updated `AnalyzeResponse` to include rotationSummary

### Misuse Detection (6 Scenarios):
1. Race shoe → daily/recovery (carbon plate waste)
2. Recovery shoe → races/speed (too soft)
3. Trail shoe → road races (lugs on pavement)
4. Road race shoe → trails (dangerous, no grip)
5. Heavy shoe (>290g) → intervals (weight penalty)
6. Plated tempo shoe → easy runs only (overkill)

### Gap Detection Priority:
1. Empty rotation → daily trainer
2. Volume modifier calculated (but doesn't block)
3. Coverage gaps (high severity first)
4. Performance gaps
5. Recovery gaps
6. Redundancy gaps
7. Volume context appended to final gap

---

## Frontend (Lovable)

### Analysis Mode Step 4a - Complete Redesign:

**Recommendation Section (Top):**
- White border with silver shimmer animation
- Orange "tempo shoe" (or whatever gap) text
- Softened language: "you'd benefit from" not "you need"
- Sticky "set preferences" button at bottom

**Rotation Summary Section:**
- Lists all current shoes with:
  - User tags ("you use it for: X")
  - Capabilities ("best suited for: Y")
- Green border + checkmark for normal shoes
- Red border + warning icon + message for misuse

### Role Mapping Fixed:
Frontend → Backend:
- "daily training" → "daily"
- "easy pace" → "easy"
- "interval" → "intervals"
- "races" → "race"
- "tempo" → "tempo"
- "trail" → "trail"

### Feel Preferences Updated:
- Cushioning slider: "max stack" ↔ "minimal" (was soft ↔ firm)
- Stability slider: "stable" ↔ "neutral"
- Energy return slider: "bouncy" ↔ "damped"

### Other Fixes:
- Weekly volume now sent in API request payload
- Back button added to analysis page
- Visual state bug fixed on Step 3 (checkmarks persist on back navigation)
- "long" role removed from displayed capabilities
- Scroll enabled on analysis page
- Button styling matches other pages

---

## Data Flow

```
Step 1: Basic Info
  └─ firstName, experience, age (optional), height (optional), weight (optional)

Step 2: Running Context  
  └─ primaryGoal, runningPattern, weeklyVolume (optional), doesTrail (optional)

Step 3: Current Rotation
  └─ For each shoe: shoeId, roles[], sentiment
  └─ Role normalization applied (frontend labels → backend enum)

Step 4: Mode Selection
  ├─ Discovery (Shopping Mode)
  │   └─ Select 1-3 shoe types → feel preferences for each → save
  │
  └─ Analysis Mode
      └─ API call (gap_detection) → display rotation summary + gap → feel preferences → save
```

---

## API Response Shape (gap_detection mode)

```typescript
{
  success: true,
  mode: "gap_detection",
  result: {
    gap: {
      type: "coverage" | "performance" | "recovery" | "redundancy",
      severity: "high" | "medium" | "low",
      reasoning: string, // Now includes volume context if applicable
      missingCapability: string
    },
    rotationSummary: [
      {
        shoe: { shoe_id: string, full_name: string },
        userRoles: string[],
        capabilities: string[],
        misuseLevel: "severe" | "suboptimal" | "good",
        misuseMessage?: string
      }
    ]
  }
}
```

---

## What's NOT Built (Deferred)

- Results page showing actual shoe recommendations (Epic 4)
- Chat explanations of recommendations (Epic 5)
- Edit rotation after completion (Epic 3 remainder)
- Trail-specific logic in gap detection
- PBs/age/height/weight used in recommendations

---

## Testing Verified

- [x] Gap detection varies by rotation composition
- [x] Gap detection varies by running pattern
- [x] Volume modifier appends context to gaps
- [x] Volume boosts severity when critical (50km + 1 shoe)
- [x] All 6 misuse scenarios trigger correctly
- [x] Shopping mode flow completes (stops at results - not built yet)
- [x] Analysis mode displays rotation summary
- [x] Role mapping works (frontend → backend)
- [x] Weekly volume sent in API payload

---

## Commits Made

```
fix: add .js extensions to all esm imports
fix: enable json module resolution in tsconfig
fix: add api tsconfig for json imports
fix: remove import attributes from chat.ts
fix: add import attributes for json in esm mode
fix: map frontend role names to backend shoe role enum
fix: remove daily role from always-critical list
feat: add rotation summary with capabilities and misuse detection
feat: add comprehensive misuse detection for all 6 scenarios
fix: add rotation summary to gap detection mode response
fix: remove long role from displayed capabilities
feat: add weekly volume logic to gap detection
fix: update weekly volume thresholds
refactor: make volume a modifier not blocker in gap detection
```

---

## Ready for Epic 4

The profile builder is complete. Users can:
1. Enter their profile information
2. Add their current shoes with role tags
3. Get gap analysis with rotation summary
4. Set feel preferences for recommended shoe type
5. (Next) See actual shoe recommendations
