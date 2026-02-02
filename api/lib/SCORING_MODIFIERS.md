# Scoring Modifiers Reference

> **Last Updated:** January 2026
> **Source:** `api/lib/shoeRetrieval.ts`

This document describes all scoring modifiers used in the shoe recommendation system. Modifiers stack additively; final score is floored at 0.

---

## Table of Contents

1. [Score Breakdown Structure](#score-breakdown-structure)
2. [Archetype Match (0–50 pts)](#archetype-match)
3. [Feel Match (variable)](#feel-match)
4. [Heel Drop Match (variable)](#heel-drop-match)
5. [Stability Bonus (0–15 pts)](#stability-bonus)
6. [Availability Bonus (0–5 pts)](#availability-bonus)
7. [Super Trainer Bonus (0–15 pts)](#super-trainer-bonus)
8. [Foot Strike Modifier](#foot-strike-modifier)
9. [Experience Modifier](#experience-modifier)
10. [Primary Goal Modifier](#primary-goal-modifier)
11. [Running Pattern Modifier](#running-pattern-modifier)
12. [Pace Bucket Modifier](#pace-bucket-modifier)
13. [BMI Modifier](#bmi-modifier)
14. [Trail Preference Modifier](#trail-preference-modifier)
15. [Love/Dislike Tag Modifier](#lovedislike-tag-modifier)
16. [Chat Context Modifiers](#chat-context-modifiers)
17. [Contrast Bonus](#contrast-bonus)
18. [Hard Filters](#hard-filters)

---

## Score Breakdown Structure

Each scored shoe returns a breakdown object:

```typescript
{
  archetypeScore: number;
  feelScore: number;
  heelDropScore: number;
  stabilityBonus: number;
  availabilityBonus: number;
  superTrainerBonus: number;
  footStrikeScore: number;
  experienceScore: number;
  primaryGoalScore: number;
  runningPatternScore: number;
  paceBucketScore: number;
  bmiScore: number;
  trailScore: number;
  loveDislikeScore: number;
  chatContextScore: number;
  contrastScore: number;
}
```

---

## Archetype Match

**Range:** 0–50 points

Scores how well a shoe matches requested archetypes.

| Archetype | Points |
|-----------|--------|
| daily_trainer | 40 |
| recovery_shoe | 40 |
| workout_shoe | 45 |
| race_shoe | 50 |
| trail_shoe | 50 |

- Multiple archetype matches stack
- Capped at 50 points total
- Super trainers can match daily_trainer, workout_shoe, and recovery_shoe (not race_shoe or trail_shoe)

---

## Feel Match

**Range:** Variable (can be significantly positive or negative)

Scores each feel dimension based on preference mode.

### Feel Dimensions

- `cushionAmount` → `cushion_softness_1to5`
- `stabilityAmount` → `stability_1to5`
- `energyReturn` → `bounce_1to5`
- `rocker` → `rocker_1to5`
- `groundFeel` → `ground_feel_1to5`
- `stackHeight` → **inverted** `ground_feel_1to5` (6 - value)

### Preference Modes

#### User Set Mode (`mode: 'user_set'`)
Strict penalties based on distance from selected value:

| Distance | Score |
|----------|-------|
| 0 (exact) | +10 |
| 1 | -7 |
| 2 | -15 |
| 3+ | -25 |

#### Cinda Decides Mode (`mode: 'cinda_decides'`)
Uses archetype-based acceptable ranges or feelGap override:

| Distance from Range | Score |
|---------------------|-------|
| 0 (in range) | +5 |
| 1 | -2 |
| 2 | -5 |
| 3+ | -10 |

#### Wildcard Mode (`mode: 'wildcard'`)
No score contribution (skipped).

### Archetype Feel Ranges

| Archetype | Cushion | Stability | Bounce | Rocker | Ground Feel | Stack Height |
|-----------|---------|-----------|--------|--------|-------------|--------------|
| daily_trainer | 3–5 | 2–4 | 2–4 | 2–4 | 2–4 | 2–4 |
| recovery_shoe | 4–5 | 2–4 | 2–4 | 2–4 | 1–3 | 3–5 |
| workout_shoe | 1–4 | 1–5 | 4–5 | 2–5 | 2–5 | 1–4 |
| race_shoe | 1–4 | 1–5 | 4–5 | 2–5 | 3–5 | 1–3 |
| trail_shoe | 2–4 | 3–5 | 2–4 | 2–4 | 3–5 | 1–3 |

### Stack Height Inversion

Stack height is the inverse of ground feel:
- User wants `stackHeight = 1` (grounded/minimal) → shoe needs `ground_feel = 5`
- User wants `stackHeight = 5` (max stack) → shoe needs `ground_feel = 1`
- Formula: `invertedGroundFeel = 6 - shoe.ground_feel_1to5`

---

## Heel Drop Match

**Range:** Variable (–30 to +15)

Uses detailed bucket-to-bucket scoring table when user has set preferences.

### Heel Drop Buckets
- `0mm`
- `1-4mm`
- `5-8mm`
- `9-12mm`
- `12mm+` / `13mm+`

### Score Table

| Shoe Drop ↓ / Pref → | 0mm | 1-4mm | 5-8mm | 9-12mm | 12mm+ |
|----------------------|-----|-------|-------|--------|-------|
| 0mm | +15 | -10 | -20 | -25 | -30 |
| 1-4mm | -5 | +15 | -5 | -15 | -20 |
| 5-8mm | -15 | -5 | +15 | -5 | -10 |
| 9-12mm | -25 | -15 | -5 | +15 | -5 |
| 13mm+ | -30 | -20 | -10 | -5 | +15 |

Best score across all user-selected ranges is used.

---

## Stability Bonus

**Range:** 0–15 points

| Stability Need | Shoe Criteria | Bonus |
|----------------|---------------|-------|
| neutral | — | 0 |
| stability | `support_type === "stability"` | +15 |
| stability | `support_type === "max_stability"` | +12 |
| stable_feel | `stability_1to5 >= 4` | +10 |

---

## Availability Bonus

**Range:** 0–5 points

| Status | Bonus |
|--------|-------|
| `available` | +5 |
| Other | 0 |

---

## Super Trainer Bonus

**Range:** 0–15 points (context-dependent)

Super trainers receive bonuses when versatility is valuable:

| Condition | Bonus |
|-----------|-------|
| Requesting `daily_trainer` archetype | +5 |
| User has 0 current shoes (one-shoe rotation) | +10 |
| Specialized requests (recovery, workout, race) | 0 |

This prevents super trainers from dominating specialized categories.

---

## Foot Strike Modifier

**Range:** –40 to +10

| Foot Strike | Criteria | Score |
|-------------|----------|-------|
| **forefoot** | `heel_geometry === "aggressive_forefoot"` | +10 |
| forefoot | `heel_drop_mm <= 6` | +5 |
| forefoot | `heel_drop_mm >= 10` | -10 |
| **heel** | `heel_geometry === "aggressive_forefoot"` | -40 |
| heel | `heel_drop_mm >= 8` | +10 |
| heel | `heel_drop_mm <= 4` | -8 |
| heel | `rocker_1to5 >= 3` | +5 |
| **midfoot** | `heel_drop_mm` 4–10 | +3 |

---

## Experience Modifier

**Range:** Variable

### Beginner
| Criteria | Score |
|----------|-------|
| Race shoe archetype requested | -15 |
| Max cushion (5) | +8 |
| Higher stability (≥3) | +5 |

### Intermediate
| Criteria | Score |
|----------|-------|
| Super trainer | +5 |
| Daily trainer archetype | +3 |

### Advanced
| Criteria | Score |
|----------|-------|
| Race shoe for race archetype | +10 |
| Lightweight workout (< 230g) | +8 |

### Note
Beginners are **hard filtered** from carbon-plated shoes.

---

## Primary Goal Modifier

**Range:** Variable

### finish_first_race
| Criteria | Score |
|----------|-------|
| Daily trainer archetype | +10 |
| Max cushion (5) | +5 |
| High stability (≥4) | +5 |

### improve_endurance
| Criteria | Score |
|----------|-------|
| Daily trainer archetype | +8 |
| Good cushion (≥4) | +5 |

### get_faster / set_pr
| Criteria | Score |
|----------|-------|
| Workout archetype + bouncy (≥4) | +10 |
| Race archetype + bouncy (≥4) | +12 |
| Light weight (< 250g) | +5 |

### run_longer_distances
| Criteria | Score |
|----------|-------|
| Daily trainer archetype | +8 |
| Good cushion (≥4) | +8 |
| Moderate bounce (≥3) | +3 |

### stay_injury_free
| Criteria | Score |
|----------|-------|
| Max cushion (5) | +10 |
| High stability (≥4) | +8 |
| Low stability (≤2) | -5 |

### enjoy_running
| Criteria | Score |
|----------|-------|
| Good cushion (≥4) | +5 |
| Good bounce (≥3) | +5 |
| Recovery shoe archetype | +5 |

---

## Running Pattern Modifier

**Range:** Variable

### training_for_race
| Criteria | Score |
|----------|-------|
| Workout archetype + bouncy (≥4) | +8 |
| Light weight (< 250g) | +5 |

### regular_running (3+ runs/week)
| Criteria | Score |
|----------|-------|
| Daily trainer archetype | +5 |
| Durable shoe | +3 |

### occasional_running (1-2 runs/week)
| Criteria | Score |
|----------|-------|
| Super trainer | +5 |
| Daily trainer archetype | +3 |

---

## Pace Bucket Modifier

**Range:** Variable

Calculates pace from race time if available. Pace buckets use 5K times:

| Pace Bucket | 5K Time |
|-------------|---------|
| elite | < 16:00 |
| fast | 16:00–20:59 |
| moderate | 21:00–26:59 |
| easy | 27:00–32:59 |
| social | ≥ 33:00 |

### elite
| Criteria | Score |
|----------|-------|
| Race archetype + plated + light (< 220g) | +15 |
| Workout archetype + bouncy (≥4) + light (< 240g) | +10 |
| Heavy shoe (> 260g) | -10 |

### fast
| Criteria | Score |
|----------|-------|
| Race archetype + bouncy (≥4) + light (< 250g) | +10 |
| Workout archetype + bouncy (≥4) | +8 |
| Heavy shoe (> 280g) | -8 |

### moderate
| Criteria | Score |
|----------|-------|
| Daily trainer archetype + good cushion (≥3) | +8 |
| Workout archetype + bouncy (≥3) | +5 |

### easy / social
| Criteria | Score |
|----------|-------|
| Max cushion (5) | +8 |
| High stability (≥4) | +5 |
| Recovery shoe archetype | +5 |

---

## BMI Modifier

**Range:** Variable

Calculated from height/weight if available.

| BMI | Criteria | Score |
|-----|----------|-------|
| ≥ 28 | Max cushion (5) | +10 |
| ≥ 28 | High stability (≥4) | +8 |
| ≥ 28 | Low cushion (≤2) | -10 |
| ≥ 28 | Low stability (≤2) | -8 |

---

## Trail Preference Modifier

**Range:** Variable

| Trail Pref | Archetype Request | Surface | Score |
|------------|-------------------|---------|-------|
| most_or_all | trail_shoe | trail | +10 |
| most_or_all | non-trail | trail | -5 |
| infrequently | trail_shoe | mixed | +8 |
| infrequently | trail_shoe | trail | +3 |
| want_to_start | trail_shoe | mixed | +10 |
| want_to_start | trail_shoe | trail | +3 |
| no_trails | any | mixed | -5 |

---

## Love/Dislike Tag Modifier

**Range:** Variable

Based on sentiment tags from current shoes in rotation.

### Love Tags (from loved shoes)

| Tag | Criteria | Score |
|-----|----------|-------|
| bouncy | bounce ≥ 4 | +8 |
| soft_cushion | cushion ≥ 4 | +8 |
| lightweight | weight < 250g | +8 |
| stable | stability ≥ 4 | +8 |
| smooth_rocker | rocker ≥ 4 | +8 |
| long_run_comfort | daily_trainer archetype | +5 |
| fast_feeling | weight < 240g | +6 |
| fast_feeling | bounce ≥ 4 | +4 |
| good_grip | wet_grip good/excellent | +5 |

### Dislike Tags (from disliked shoes)

| Tag | Criteria | Score |
|-----|----------|-------|
| too_heavy | weight > 280g | -12 |
| too_soft | cushion = 5 | -12 |
| too_firm | cushion ≤ 2 | -12 |
| unstable | stability ≤ 2 | -12 |
| too_narrow | toe_box = narrow | -15 |
| too_wide | toe_box = roomy | -15 |
| slow_at_speed | bounce ≤ 2 | -8 |
| slow_at_speed | weight > 280g | -5 |

---

## Chat Context Modifiers

Combined scoring from chat-extracted context. Includes:

### Injury Modifiers

| Injury | Criteria | Score |
|--------|----------|-------|
| Shin/tibia | cushion ≥ 4 | +12 |
| Shin/tibia | stability ≥ 3 | +8 |
| Shin/tibia | cushion ≤ 2 | -10 |
| Plantar/heel | cushion ≥ 4 | +12 |
| Plantar/heel | stability ≥ 3 | +8 |
| Plantar/heel | drop ≤ 4mm | -10 |
| Plantar/heel | drop ≥ 8mm | +5 |
| Achilles | drop ≥ 8mm | +10 |
| Achilles | drop ≤ 4mm | -12 |
| Achilles | aggressive_forefoot | -15 |
| Knee/IT band | cushion ≥ 4 | +10 |
| Knee/IT band | stability ≥ 3 | +10 |
| Knee/IT band | stability ≤ 2 | -8 |
| Hip/back | cushion ≥ 4 | +10 |
| Metatarsal/Morton's | cushion ≥ 4 | +8 |
| Metatarsal/Morton's | roomy/wide toe | +10 |
| Metatarsal/Morton's | narrow toe | -12 |

### Fit Modifiers

| Fit Need | Criteria | Score |
|----------|----------|-------|
| wide/extra_wide | roomy/wide toe | +12 |
| wide/extra_wide | wide option available | +8 |
| wide/extra_wide | narrow toe | -15 |
| wide/extra_wide | snug/narrow fit | -10 |
| narrow | narrow toe | +10 |
| narrow | snug fit | +8 |
| narrow | roomy/wide toe | -10 |
| high_volume | roomy fit | +10 |
| high_volume | snug/narrow fit | -10 |
| low_volume | snug fit | +10 |
| low_volume | roomy fit | -8 |

### Climate Modifiers

| Climate | Criteria | Score |
|---------|----------|-------|
| wet/rain | excellent grip | +12 |
| wet/rain | good grip | +8 |
| wet/rain | poor grip | -12 |
| wet/rain | average grip | -3 |
| cold/winter | excellent grip | +10 |
| cold/winter | good grip | +6 |
| cold/winter | poor grip | -10 |
| hot/humid | weight < 250g | +5 |
| hot/humid | weight > 300g | -5 |

### Request Modifiers

Chat requests like "I want something lightweight" or "need more cushion":

| Request | Criteria | Score |
|---------|----------|-------|
| light/lightweight | weight < 230g | +12 |
| light/lightweight | weight < 260g | +6 |
| light/lightweight | weight > 300g | -10 |
| cushion/soft/plush | cushion ≥ 4 | +10 |
| cushion/soft/plush | cushion ≤ 2 | -10 |
| firm/responsive | bounce ≥ 4 | +8 |
| firm/responsive | cushion ≤ 3 | +5 |
| stable/stability | stability ≥ 4 | +10 |
| stable/stability | stability ≤ 2 | -8 |
| fast/speed/racing | weight < 250g | +8 |
| fast/speed/racing | bounce ≥ 4 | +6 |
| fast/speed/racing | has_plate | +5 |
| long_run/marathon | cushion ≥ 3 | +5 |
| long_run/marathon | daily_trainer | +5 |
| recovery/easy | cushion ≥ 4 | +8 |
| recovery/easy | recovery_shoe | +8 |
| bouncy/energetic | bounce ≥ 4 | +10 |
| bouncy/energetic | bounce ≤ 2 | -8 |
| rocker | rocker ≥ 4 | +10 |
| ground_feel | ground_feel ≥ 4 | +10 |
| ground_feel | ground_feel ≤ 2 | -8 |
| low_drop/zero_drop | drop ≤ 4mm | +10 |
| low_drop/zero_drop | drop ≥ 10mm | -8 |

### Past Shoe Modifiers

Based on liked/disliked shoes mentioned in chat:

| Sentiment | Reason | Criteria | Score |
|-----------|--------|----------|-------|
| loved/liked | cushion/soft | cushion ≥ 4 | +6 |
| loved/liked | bouncy/responsive | bounce ≥ 4 | +6 |
| loved/liked | light | weight < 250g | +6 |
| loved/liked | stable | stability ≥ 4 | +6 |
| disliked/hated | too soft/mushy | cushion ≥ 4 | -8 |
| disliked/hated | too firm/harsh | cushion ≤ 2 | -8 |
| disliked/hated | heavy | weight > 280g | -8 |
| disliked/hated | unstable/wobbly | stability ≤ 2 | -8 |
| disliked/hated | narrow/tight | narrow toe | -10 |
| disliked/hated | wide/sloppy | roomy/wide toe | -8 |

---

## Contrast Bonus

**Range:** 0–50 points

Rewards shoes that differ from current rotation profile (variety mode).

| Dimension Difference | Bonus |
|---------------------|-------|
| ≥ 2 points | +10 |
| 1 point | +5 |

Dimensions checked:
- cushion
- bounce
- rocker
- stability
- groundFeel

Maximum theoretical bonus: +50 (all 5 dimensions differ by 2+)

---

## Hard Filters

Shoes are **excluded** (not scored) if they fail these checks:

1. **Excluded IDs**: Shoe already in current rotation
2. **Brand Include**: Profile specifies brands to include, shoe brand not in list
3. **Brand Exclude**: Profile specifies brands to exclude, shoe brand in list
4. **Chat Brand Exclusion**: Brand was disliked/hated in chat context
5. **Trail/Road Separation**:
   - Trail request but shoe isn't trail
   - Road request but shoe is trail-only
6. **Archetype Mismatch**: Shoe doesn't match any requested archetype
7. **Beginner Carbon Filter**: Beginner profile + carbon-plated shoe

---

## Score Calculation

Final score is the sum of all modifiers, floored at 0:

```typescript
totalScore = Math.max(0,
  archetypeScore +
  feelScore +
  heelDropScore +
  stabilityBonus +
  availabilityBonus +
  superTrainerBonus +
  footStrikeBonus +
  experienceModifier +
  primaryGoalModifier +
  runningPatternModifier +
  paceBucketModifier +
  bmiModifier +
  trailPreferenceModifier +
  loveDislikeModifier +
  chatContextModifier +
  contrastBonus
);
```

Shoes are sorted by score (descending), with `shoe_id` as tiebreaker.
