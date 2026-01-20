# Epic 6a & 6b Complete

## Overview

**Epic 6a:** Archetype Migration
**Epic 6b:** Scoring System & Chat Integration

**Status:** Complete
**Date:** January 2026

---

## Epic 6a: Archetype Migration

### What Changed

Migrated from role-based to archetype-based shoe classification.

**Old model (roles):**
- `use_for_easy`, `use_for_tempo`, `use_for_race`, etc.
- Shoes tagged by what runs they're "for"

**New model (archetypes):**
- `is_daily_trainer`, `is_recovery_shoe`, `is_workout_shoe`, `is_race_shoe`, `is_trail_shoe`
- Shoes tagged by what type of shoe they ARE

### Why

- Cleaner mental model: "What is this shoe?" vs "What can I use it for?"
- Better gap detection: Check if user has each archetype they need
- Matches how runners actually think about their rotation

### Files Changed

- `shoebase.json` - Updated all 72 shoes with new archetype columns
- `/api/types.ts` - New `ShoeArchetype` type, `RUN_TYPE_MAPPING`
- `/api/lib/shoeRetrieval.ts` - Updated scoring to use archetypes
- `/api/lib/rotationAnalyzer.ts` - Analyze rotation by archetypes
- `/api/lib/gapDetector.ts` - Detect gaps by missing archetypes

### Run Type → Archetype Mapping

| Run Type | Suitable Archetypes |
|----------|---------------------|
| All runs | Daily trainer |
| Recovery | Recovery shoe, Daily trainer |
| Long runs | Daily trainer, Workout shoe, Recovery shoe |
| Workouts | Workout shoe, Race shoe |
| Races | Race shoe, Workout shoe |
| Trail | Trail shoe |

---

## Epic 6b: Scoring System & Chat Integration

### Scoring Modifiers Implemented

All scoring modifiers now active and tested:

| Modifier | Points | Description |
|----------|--------|-------------|
| Archetype match | 45 | Shoe matches requested archetype |
| Feel preferences | -15 to +15 | Cushion, stability, bounce alignment |
| Heel drop bucket | 0-10 | Matches user's preferred drop range |
| Availability | 15 | Shoe is currently available |
| Experience level | 0-10 | Appropriate for beginner/intermediate/competitive |
| Primary goal | 0-22 | Aligns with user's training goal |
| Running pattern | 0-10 | Fits structured/regular/casual pattern |
| Foot strike | 0-10 | Heel/mid/fore strike considerations |
| Pace bucket | 0-15 | Based on race time (speed level) |
| BMI | 0-10 | Cushion/stability needs from height/weight |
| Trail preference | 0-15 | Trail vs road filtering |
| Love/dislike tags | -10 to +10 | Based on current shoe feedback |
| Chat context | 0-40 | Injuries, fit, climate, past shoes |
| Brand filter | exclude | Removes disliked brands entirely |

### Chat Integration

Chat step added between current shoes and mode selection:

- **Two-part intro:** "👋 hey, cinda here" + random variation
- **Word-by-word typing animation**
- **Structured extraction:** injuries, fit issues, past shoes, climate, requests
- **Cinda's voice:** lowercase, casual, brief responses

Chat context stored in ProfileContext and sent to `/api/analyze`.

### Shoe Card Bullets

- 3 bullets per shoe, max 13 words each
- Uses GPT-5-mini with rich shoe data
- Specific tech names (foam, plate), not marketing fluff
- Consistent punctuation (no trailing periods)

### Discovery Mode

Working flow:
1. User selects archetype they want
2. Sets feel preferences
3. Scoring applies all modifiers
4. Returns top 3 recommendations with bullets

### Analysis Mode

Working flow:
1. User enters profile + current shoes
2. API analyzes rotation, identifies gap
3. Shows rotation summary with:
   - "you use it for:" (user's run types)
   - "best suited for:" (shoe's optimal run types)
   - Misuse warnings (red border) when applicable
4. Recommends archetype to fill gap
5. User sets preferences → gets recommendations

### Key Fixes in 6b

1. **Field name mismatch:** Frontend expected `userRoles`/`capabilities`, API returned `userRunTypes`/`archetypes` - fixed
2. **recommendedArchetype wrong:** Was always returning `daily_trainer` regardless of actual gap - fixed
3. **Discovery mode sending wrong API mode:** Was sending `analysis` instead of `discovery` - fixed
4. **"Best suited for" showing archetypes:** Now shows run types with proper mapping
5. **Crash on analysis page:** Multiple `.map()` calls on undefined arrays - added guards

### "Best Suited For" Mapping

| Archetype(s) | Best suited for |
|--------------|-----------------|
| daily_trainer | recovery runs, long runs at a comfortable pace |
| recovery_shoe | recovery runs |
| workout_shoe | workouts, long runs with workout segments |
| race_shoe | races, workouts, long runs with workout segments |
| trail_shoe | trail |
| daily_trainer + workout_shoe | recovery runs, all long runs, workouts |
| daily_trainer + race_shoe | recovery runs, all long runs, workouts, races |

### UI Updates

- Mode renamed: "discovery" → "find a specific shoe"
- Mode renamed: "analysis" → "check my rotation"
- New icons: target (discovery), circular arrows (analysis)
- Chat input redesigned: send button outside input box, "continue" top-right

---

## What's NOT in 6a/6b (Deferred to 6c)

- Tiered gap detection (genuine gaps vs improvements vs exploration)
- Rotation health scoring
- AI-generated rotation summary prose
- Secondary recommendations
- "Too quick to say no gaps" issue

---

## API Response Shapes

### Discovery Mode

```typescript
{
  success: true,
  mode: "discovery",
  result: {
    recommendations: [
      {
        shoe: Shoe,
        score: number,
        scoreBreakdown: { ... },
        bullets: string[]
      }
    ]
  }
}
```

### Analysis Mode (Gap Detection)

```typescript
{
  success: true,
  mode: "gap_detection",
  result: {
    gap: {
      type: "coverage" | "performance" | "recovery" | "redundancy" | "misuse",
      severity: "high" | "medium" | "low",
      reasoning: string,
      recommendedArchetype: ShoeArchetype
    },
    rotationSummary: [
      {
        shoe: Shoe,
        userRunTypes: string[],
        archetypes: ShoeArchetype[],
        misuseLevel: "good" | "suboptimal" | "severe",
        misuseMessage?: string
      }
    ]
  }
}
```

---

## Test Verification

### Test Profile Used

```
Name: Test
Experience: intermediate
Primary goal: get_faster
Running pattern: structured_training
Trail: no_trails
Foot strike: unsure

Current shoe: HOKA Clifton 10
- Run types: recovery
- Sentiment: neutral

Mode: Analysis
```

### Expected & Confirmed Results

- ✅ Gap detected: workout_shoe
- ✅ Reasoning: "Your training focus suggests you need a responsive workout shoe for speed sessions."
- ✅ Title shows: "workout shoe" (not "daily trainer")
- ✅ Button shows: "set preferences for your new workout shoe"
- ✅ Rotation summary shows: "best suited for: recovery runs, long runs at a comfortable pace"

---

## Files Modified in 6b

### Backend (Claude Code)
- `/api/analyze.ts`
- `/api/lib/gapDetector.ts`
- `/api/lib/rotationAnalyzer.ts`
- `/api/lib/shoeRetrieval.ts`
- `/api/lib/recommendationEngine.ts`
- `/api/chat.ts`
- `/api/types.ts`

### Frontend (Lovable)
- `src/pages/ProfileBuilderStep4Analysis.tsx`
- `src/pages/ProfileBuilderStep4a.tsx`
- `src/pages/ProfileBuilderStep4b.tsx`
- `src/pages/ProfileBuilderStep3b.tsx` (chat)
- `src/pages/Recommendations.tsx`
- `src/contexts/ProfileContext.tsx`

---

## Ready for Epic 6c

Epic 6c will address:
- Tiered recommendation system (Tier 1: gaps, Tier 2: improvements, Tier 3: exploration)
- Rotation health scoring (coverage, variety, load resilience, goal alignment)
- AI-generated rotation summary
- Up to 2 recommendations (primary + secondary)
- Better "no gaps" handling for complete rotations

See `EPIC6C_BRIEF.md` for full specification.
