// ============================================================================
// SHOE RETRIEVAL LOGIC
// Filters and scores the 72-shoe catalogue to return 20-30 candidates
// Updated for archetype-based model
// ============================================================================

import type {
  Shoe,
  ShoeArchetype,
  RunType,
  FeelPreferences,
  PreferenceValue,
  HeelDropPreference,
  RunnerProfile,
  CurrentShoe
} from '../types.js';
import {
  shoeHasArchetype,
  getShoeArchetypes,
  RUN_TYPE_MAPPING
} from '../types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RetrievalConstraints {
  archetypes?: ShoeArchetype[];
  archetypeContext?: ShoeArchetype; // Current archetype context for cinda_decides mode
  stabilityNeed?: "neutral" | "stability" | "stable_feel";
  feelPreferences?: FeelPreferences;
  excludeShoeIds?: string[];
  profile?: RunnerProfile; // For brand preferences and other profile-based filtering
  currentShoes?: CurrentShoe[]; // For love/dislike tag modifiers
}

export interface ScoredShoe {
  shoe: Shoe;
  score: number;
  breakdown?: {
    archetypeScore: number;
    feelScore: number;
    stabilityBonus: number;
    availabilityBonus: number;
  };
}

// ============================================================================
// ARCHETYPE HELPERS
// ============================================================================

/**
 * Get related archetypes for fallback expansion
 */
function getRelatedArchetypes(archetype: ShoeArchetype): ShoeArchetype[] {
  const relatedMap: Record<ShoeArchetype, ShoeArchetype[]> = {
    'daily_trainer': ['recovery_shoe', 'workout_shoe'],
    'recovery_shoe': ['daily_trainer'],
    'workout_shoe': ['daily_trainer', 'race_shoe'],
    'race_shoe': ['workout_shoe'],
    'trail_shoe': [], // Trail doesn't mix with road
  };
  return relatedMap[archetype] || [];
}

// ============================================================================
// HARD FILTERS
// ============================================================================

/**
 * Apply hard filters that must match
 * Returns true if shoe passes all filters
 */
function passesHardFilters(
  shoe: Shoe,
  constraints: RetrievalConstraints
): boolean {
  const { archetypes, excludeShoeIds, profile } = constraints;

  // Filter 1: Exclude shoes already in rotation
  if (excludeShoeIds && excludeShoeIds.includes(shoe.shoe_id)) {
    return false;
  }

  // Filter 2: Brand filtering from profile
  if (profile?.brandPreference) {
    const { mode, brands } = profile.brandPreference;
    if (mode === "include" && brands.length > 0) {
      if (!brands.some(b => b.toLowerCase() === shoe.brand.toLowerCase())) {
        return false;
      }
    }
    if (mode === "exclude" && brands.length > 0) {
      if (brands.some(b => b.toLowerCase() === shoe.brand.toLowerCase())) {
        return false;
      }
    }
  }

  // Filter 3: Trail vs Road separation (CRITICAL - never mix)
  if (archetypes && archetypes.length > 0) {
    const requestingTrail = archetypes.includes('trail_shoe');
    const requestingRoad = archetypes.some(a => a !== 'trail_shoe');

    if (requestingTrail && !shoeHasArchetype(shoe, 'trail_shoe')) {
      return false; // Need trail shoe but this isn't one
    }

    if (requestingRoad && shoeHasArchetype(shoe, 'trail_shoe') && !requestingTrail) {
      // Check if shoe is ONLY a trail shoe
      const shoeArchetypes = getShoeArchetypes(shoe);
      if (shoeArchetypes.length === 1 && shoeArchetypes[0] === 'trail_shoe') {
        return false; // Need road shoe but this is trail-only
      }
    }

    // Filter 4: HARD FILTER by archetype flags
    // Shoe must match at least ONE of the requested archetypes
    const matchesAnyArchetype = archetypes.some(archetype =>
      shoeHasArchetype(shoe, archetype)
    );

    if (!matchesAnyArchetype) {
      return false; // Shoe doesn't match any requested archetype
    }
  }

  // Filter 5: Experience-based carbon plate restriction
  if (profile?.experience === "beginner") {
    if (shoe.has_plate && shoe.plate_material?.toLowerCase() === "carbon") {
      return false; // Beginners shouldn't get carbon-plated shoes
    }
  }

  return true;
}

// ============================================================================
// SOFT SCORING
// ============================================================================

/**
 * Score how well shoe matches requested archetypes (0-50 points)
 */
export function scoreArchetypeMatch(shoe: Shoe, archetypes: ShoeArchetype[] = []): number {
  if (archetypes.length === 0) {
    // No archetypes specified - treat as daily trainer search
    return shoeHasArchetype(shoe, 'daily_trainer') ? 30 : 0;
  }

  // Point values for each archetype
  const archetypePoints: Record<ShoeArchetype, number> = {
    'daily_trainer': 40,
    'recovery_shoe': 40,
    'workout_shoe': 45,
    'race_shoe': 50,
    'trail_shoe': 50,
  };

  let score = 0;
  let matchCount = 0;

  for (const archetype of archetypes) {
    if (shoeHasArchetype(shoe, archetype)) {
      score += archetypePoints[archetype];
      matchCount++;
    }
  }

  // Cap and normalize
  return Math.min(score, 50);
}

/**
 * Get archetype-based default preference values for cinda_decides mode
 */
function getArchetypeDefault(
  dimension: 'cushion' | 'stability' | 'bounce' | 'rocker' | 'groundFeel',
  archetype?: ShoeArchetype
): number {
  const defaults: Record<string, Record<ShoeArchetype, number>> = {
    cushion: {
      daily_trainer: 3, recovery_shoe: 4, workout_shoe: 2, race_shoe: 2, trail_shoe: 3
    },
    stability: {
      daily_trainer: 3, recovery_shoe: 3, workout_shoe: 2, race_shoe: 2, trail_shoe: 4
    },
    bounce: {
      daily_trainer: 3, recovery_shoe: 2, workout_shoe: 5, race_shoe: 5, trail_shoe: 2
    },
    rocker: {
      daily_trainer: 3, recovery_shoe: 2, workout_shoe: 4, race_shoe: 5, trail_shoe: 2
    },
    groundFeel: {
      daily_trainer: 3, recovery_shoe: 2, workout_shoe: 3, race_shoe: 4, trail_shoe: 4
    }
  };

  return defaults[dimension]?.[archetype ?? 'daily_trainer'] ?? 3;
}

/**
 * Ordered list of heel drop ranges for distance calculation
 */
const HEEL_DROP_RANGES: Array<"0mm" | "1-4mm" | "5-8mm" | "9-12mm" | "12mm+"> =
  ["0mm", "1-4mm", "5-8mm", "9-12mm", "12mm+"];

/**
 * Calculate distance from shoe's heel drop to user's selected ranges
 */
export function getHeelDropRangeDistance(
  shoeDropMm: number,
  selectedRanges: Array<"0mm" | "1-4mm" | "5-8mm" | "9-12mm" | "12mm+">
): number {
  // Determine which range the shoe falls into
  let shoeRange: "0mm" | "1-4mm" | "5-8mm" | "9-12mm" | "12mm+";
  if (shoeDropMm === 0) shoeRange = "0mm";
  else if (shoeDropMm >= 1 && shoeDropMm <= 4) shoeRange = "1-4mm";
  else if (shoeDropMm >= 5 && shoeDropMm <= 8) shoeRange = "5-8mm";
  else if (shoeDropMm >= 9 && shoeDropMm <= 12) shoeRange = "9-12mm";
  else shoeRange = "12mm+";

  // Perfect match?
  if (selectedRanges.includes(shoeRange)) return 0;

  // Calculate minimum distance to any selected range
  const shoeIndex = HEEL_DROP_RANGES.indexOf(shoeRange);
  const minDistance = Math.min(
    ...selectedRanges.map(range => {
      const rangeIndex = HEEL_DROP_RANGES.indexOf(range);
      return Math.abs(rangeIndex - shoeIndex);
    })
  );

  return minDistance;
}

/**
 * Score how well shoe's feel matches preferences
 * Uses SCORING_MODIFIERS.md spec values
 */
export function scoreFeelMatch(
  shoe: Shoe,
  prefs?: FeelPreferences,
  archetypeContext?: ShoeArchetype
): number {
  if (!prefs) {
    return 0; // No preferences, no score contribution
  }

  let totalScore = 0;

  // Helper to score a single dimension per SCORING_MODIFIERS.md spec
  const scoreDimension = (
    shoeValue: number,
    pref: PreferenceValue,
    dimension: 'cushion' | 'stability' | 'bounce' | 'rocker' | 'groundFeel'
  ): number => {
    if (pref.mode === 'wildcard') {
      return 0; // Skip - no score contribution
    }

    if (pref.mode === 'user_set' && pref.value !== undefined) {
      // USER SET: Strict penalties per spec
      const distance = Math.abs(shoeValue - pref.value);
      if (distance === 0) return 10;   // Perfect match
      if (distance === 1) return -7;   // Off by 1
      if (distance === 2) return -15;  // Off by 2
      return -25;                      // Off by 3+
    } else {
      // CINDA DECIDES: Softer penalties per spec
      const targetValue = getArchetypeDefault(dimension, archetypeContext);
      const distance = Math.abs(shoeValue - targetValue);
      if (distance === 0) return 5;    // Perfect match
      if (distance === 1) return -2;   // Off by 1
      if (distance === 2) return -5;   // Off by 2
      return -10;                      // Off by 3+
    }
  };

  // Score each dimension
  totalScore += scoreDimension(shoe.cushion_softness_1to5, prefs.cushionAmount, 'cushion');
  totalScore += scoreDimension(shoe.stability_1to5, prefs.stabilityAmount, 'stability');
  totalScore += scoreDimension(shoe.bounce_1to5, prefs.energyReturn, 'bounce');
  totalScore += scoreDimension(shoe.rocker_1to5, prefs.rocker, 'rocker');
  totalScore += scoreDimension(shoe.ground_feel_1to5, prefs.groundFeel, 'groundFeel');

  return totalScore;
}

/**
 * Score heel drop match using detailed bucket table from SCORING_MODIFIERS.md
 */
function scoreHeelDropMatch(shoe: Shoe, prefs?: FeelPreferences): number {
  if (!prefs?.heelDropPreference) return 0;

  const heelPref = prefs.heelDropPreference;
  if (heelPref.mode !== 'user_set' || !heelPref.values || heelPref.values.length === 0) {
    return 0;
  }

  const drop = shoe.heel_drop_mm;

  // Determine shoe's heel drop bucket
  let shoeBucket: string;
  if (drop === 0) shoeBucket = "0mm";
  else if (drop >= 1 && drop <= 4) shoeBucket = "1-4mm";
  else if (drop >= 5 && drop <= 8) shoeBucket = "5-8mm";
  else if (drop >= 9 && drop <= 12) shoeBucket = "9-12mm";
  else shoeBucket = "13mm+";

  // Detailed scoring table from SCORING_MODIFIERS.md
  const heelDropScoreTable: Record<string, Record<string, number>> = {
    "0mm": { "0mm": 15, "1-4mm": -10, "5-8mm": -20, "9-12mm": -25, "12mm+": -30 },
    "1-4mm": { "0mm": -5, "1-4mm": 15, "5-8mm": -5, "9-12mm": -15, "12mm+": -20 },
    "5-8mm": { "0mm": -15, "1-4mm": -5, "5-8mm": 15, "9-12mm": -5, "12mm+": -10 },
    "9-12mm": { "0mm": -25, "1-4mm": -15, "5-8mm": -5, "9-12mm": 15, "12mm+": -5 },
    "13mm+": { "0mm": -30, "1-4mm": -20, "5-8mm": -10, "9-12mm": -5, "12mm+": 15 }
  };

  // Find best score across all selected ranges
  let bestScore = -100;
  for (const userRange of heelPref.values) {
    // Normalize "12mm+" to "13mm+" for lookup
    const normalizedUserRange = userRange === "12mm+" ? "13mm+" : userRange;
    const score = heelDropScoreTable[normalizedUserRange]?.[shoeBucket] ?? -30;
    if (score > bestScore) bestScore = score;
  }

  return bestScore;
}

/**
 * Apply stability bonus if shoe matches stability needs (0-15 points)
 */
function scoreStabilityBonus(
  shoe: Shoe,
  stabilityNeed?: "neutral" | "stability" | "stable_feel"
): number {
  if (!stabilityNeed || stabilityNeed === "neutral") {
    return 0;
  }

  if (stabilityNeed === "stability" && shoe.support_type === "stability") {
    return 15;
  }

  if (stabilityNeed === "stability" && shoe.support_type === "max_stability") {
    return 12;
  }

  if (stabilityNeed === "stable_feel" && shoe.stability_1to5 >= 4) {
    return 10;
  }

  return 0;
}

/**
 * Apply availability bonus (0-15 points)
 */
function scoreAvailability(shoe: Shoe): number {
  if (shoe.release_status === "available") {
    return 15;
  }
  if (shoe.release_status === "coming_soon") {
    return 10;
  }
  if (shoe.release_status === "regional") {
    return 5;
  }
  return 0;
}

// ============================================================================
// PROFILE-BASED MODIFIERS (per SCORING_MODIFIERS.md)
// ============================================================================

/**
 * Experience level soft modifiers (carbon ban is in hard filters)
 * Per SCORING_MODIFIERS.md
 */
function scoreExperienceModifiers(
  shoe: Shoe,
  profile?: RunnerProfile,
  requestedArchetype?: ShoeArchetype
): number {
  if (!profile?.experience) return 0;

  let score = 0;
  const exp = profile.experience;

  if (exp === "beginner") {
    // Stability boost for beginners
    if (shoe.stability_1to5 >= 3) score += 10;
    // Cushion boost for beginners
    if (shoe.cushion_softness_1to5 >= 4) score += 8;
    // Race shoe penalty (if not also a daily trainer)
    if (shoeHasArchetype(shoe, 'race_shoe') && !shoeHasArchetype(shoe, 'daily_trainer')) {
      score -= 15;
    }
    // Lightweight penalty (too light/unstable for beginners)
    if (shoe.weight_g < 220) score -= 5;
  }

  if (exp === "intermediate") {
    // Race-only shoes get mild penalty
    if (shoeHasArchetype(shoe, 'race_shoe') &&
        !shoeHasArchetype(shoe, 'daily_trainer') &&
        !shoeHasArchetype(shoe, 'workout_shoe')) {
      score -= 5;
    }
  }

  if (exp === "experienced") {
    // Weight penalty for heavy workout shoes
    if (requestedArchetype === "workout_shoe" && shoe.weight_g > 290) {
      score -= 5;
    }
  }

  if (exp === "competitive") {
    // Light shoe bonus for workout/race shoes
    if ((requestedArchetype === "workout_shoe" || requestedArchetype === "race_shoe") &&
        shoe.weight_g < 250) {
      score += 5;
    }
  }

  return score;
}

/**
 * Primary goal modifiers per SCORING_MODIFIERS.md
 */
function scorePrimaryGoalModifiers(
  shoe: Shoe,
  profile?: RunnerProfile,
  requestedArchetype?: ShoeArchetype
): number {
  if (!profile?.primaryGoal) return 0;

  let score = 0;
  const goal = profile.primaryGoal;

  if (goal === "general_fitness") {
    // Daily trainer bonus
    if (shoeHasArchetype(shoe, 'daily_trainer')) score += 5;
  }

  if (goal === "get_faster") {
    // Bounce bonus
    if (shoe.bounce_1to5 >= 4) score += 5;
    // Plated workout shoe bonus
    if (shoe.has_plate && requestedArchetype === "workout_shoe") score += 8;
  }

  if (goal === "race_training") {
    // Race shoe bonus when searching for race shoes
    if (requestedArchetype === "race_shoe" && shoeHasArchetype(shoe, 'race_shoe')) {
      score += 10;
    }
    // Plated workout shoe bonus
    if (requestedArchetype === "workout_shoe" && shoe.has_plate) {
      score += 5;
    }
  }

  if (goal === "injury_comeback") {
    // Cushion bonus
    if (shoe.cushion_softness_1to5 >= 4) score += 12;
    // Stability bonus
    if (shoe.stability_1to5 >= 3) score += 10;
    // Carbon plate penalty
    if (shoe.has_plate && shoe.plate_material?.toLowerCase() === "carbon") {
      score -= 10;
    }
    // Aggressive rocker penalty
    if (shoe.rocker_1to5 >= 4) score -= 5;
  }

  return score;
}

/**
 * Running pattern modifiers per SCORING_MODIFIERS.md
 */
function scoreRunningPatternModifiers(
  shoe: Shoe,
  profile?: RunnerProfile,
  requestedArchetype?: ShoeArchetype
): number {
  if (!profile?.runningPattern) return 0;

  let score = 0;
  const pattern = profile.runningPattern;

  if (pattern === "mostly_easy") {
    // Cushion bonus
    if (shoe.cushion_softness_1to5 >= 4) score += 5;
    // Recovery shoe bonus
    if (shoeHasArchetype(shoe, 'recovery_shoe')) score += 5;
  }

  if (pattern === "workout_focused") {
    if (requestedArchetype === "workout_shoe") {
      // Plated shoe bonus
      if (shoe.has_plate) score += 10;
      // Bounce bonus
      if (shoe.bounce_1to5 >= 4) score += 5;
    }
  }

  if (pattern === "infrequent") {
    // Daily trainer bonus - single versatile shoe is best
    if (shoeHasArchetype(shoe, 'daily_trainer')) score += 8;
  }

  // structured_training has no direct scoring modifier (affects gap detection only)

  return score;
}

/**
 * Calculate pace bucket from race time per SCORING_MODIFIERS.md
 * Uses half marathon as baseline
 */
function getPaceBucket(profile?: RunnerProfile): "elite" | "fast" | "moderate" | "developing" | "newer" | null {
  if (!profile?.raceTime) return null;

  const { distance, timeMinutes } = profile.raceTime;

  // Convert to half marathon equivalent
  const conversionFactors: Record<string, number> = {
    "5k": 4.6,
    "10k": 2.2,
    "half": 1.0,
    "marathon": 0.48
  };

  const factor = conversionFactors[distance];
  if (!factor) return null;

  const hmEquivalent = timeMinutes * factor;

  if (hmEquivalent < 75) return "elite";      // < 1:15
  if (hmEquivalent < 95) return "fast";       // 1:15 - 1:35
  if (hmEquivalent < 120) return "moderate";  // 1:35 - 2:00
  if (hmEquivalent < 150) return "developing"; // 2:00 - 2:30
  return "newer";                              // > 2:30
}

/**
 * Pace bucket modifiers per SCORING_MODIFIERS.md
 */
function scorePaceBucketModifiers(
  shoe: Shoe,
  profile?: RunnerProfile,
  requestedArchetype?: ShoeArchetype
): number {
  const paceBucket = getPaceBucket(profile);
  if (!paceBucket) return 0;

  let score = 0;

  if (paceBucket === "elite") {
    // Full access, no restrictions - all plate types encouraged
    // No modifiers needed
  }

  if (paceBucket === "fast") {
    // Plated workout shoe bonus
    if (requestedArchetype === "workout_shoe" && shoe.has_plate) score += 8;
    // Carbon plated race shoe bonus
    if (requestedArchetype === "race_shoe" && shoe.has_plate &&
        shoe.plate_material?.toLowerCase() === "carbon") {
      score += 10;
    }
  }

  if (paceBucket === "moderate") {
    // Mild plated workout shoe bonus
    if (requestedArchetype === "workout_shoe" && shoe.has_plate) score += 3;
    // Aggressive rocker slight penalty
    if (shoe.rocker_1to5 === 5) score -= 5;
    // Stability bonus for recovery shoes
    if (requestedArchetype === "recovery_shoe" && shoe.stability_1to5 >= 3) score += 5;
  }

  if (paceBucket === "developing") {
    // Aggressive rocker penalty
    if (shoe.rocker_1to5 === 5) score -= 5;
    // Stability and cushion bonuses for recovery/daily
    if (requestedArchetype === "recovery_shoe" || requestedArchetype === "daily_trainer") {
      if (shoe.stability_1to5 >= 3) score += 8;
      if (shoe.cushion_softness_1to5 >= 4) score += 5;
    }
  }

  if (paceBucket === "newer") {
    // Carbon plated race shoe penalty
    if (requestedArchetype === "race_shoe" && shoe.has_plate &&
        shoe.plate_material?.toLowerCase() === "carbon") {
      score -= 10;
    }
    // Aggressive rocker penalty
    if (shoe.rocker_1to5 === 5) score -= 10;
    // Stability bonus
    if (shoe.stability_1to5 >= 3) score += 10;
    // Cushion bonus
    if (shoe.cushion_softness_1to5 >= 4) score += 8;
    // Soft + unstable penalty
    if (shoe.stability_1to5 <= 2 && shoe.cushion_softness_1to5 >= 4) score -= 8;
  }

  return score;
}

/**
 * Calculate BMI from profile per SCORING_MODIFIERS.md
 */
function getBMI(profile?: RunnerProfile): number | null {
  if (!profile?.height || !profile?.weight) return null;

  // Convert height to cm
  let heightCm = profile.height.value;
  if (profile.height.unit === "in") {
    heightCm = profile.height.value * 2.54;
  }

  // Convert weight to kg
  let weightKg = profile.weight.value;
  if (profile.weight.unit === "lb") {
    weightKg = profile.weight.value * 0.453592;
  }

  return weightKg / ((heightCm / 100) ** 2);
}

/**
 * BMI modifiers per SCORING_MODIFIERS.md
 * Only applied if both height and weight provided
 * Never overrides explicit user preferences
 */
function scoreBMIModifiers(shoe: Shoe, profile?: RunnerProfile): number {
  const bmi = getBMI(profile);
  if (!bmi) return 0;

  let score = 0;

  if (bmi < 22) {
    // No modifier
  } else if (bmi >= 22 && bmi < 27) {
    if (shoe.cushion_softness_1to5 >= 4) score += 3;
  } else if (bmi >= 27 && bmi < 32) {
    if (shoe.cushion_softness_1to5 >= 4) score += 6;
    if (shoe.stability_1to5 >= 4) score += 4;
  } else if (bmi >= 32) {
    if (shoe.cushion_softness_1to5 === 5) score += 10;
    if (shoe.stability_1to5 >= 4) score += 8;
    if (shoe.cushion_softness_1to5 <= 2) score -= 8; // Minimal cushion risky
  }

  return score;
}

/**
 * Love/dislike tag modifiers from current shoes per SCORING_MODIFIERS.md
 */
function scoreLoveDislikeTagModifiers(shoe: Shoe, currentShoes?: CurrentShoe[]): number {
  if (!currentShoes || currentShoes.length === 0) return 0;

  let score = 0;

  // Process love tags - boost similar
  for (const currentShoe of currentShoes) {
    if (currentShoe.sentiment === "love" && currentShoe.loveTags) {
      for (const tag of currentShoe.loveTags) {
        switch (tag) {
          case "bouncy":
            if (shoe.bounce_1to5 >= 4) score += 8;
            break;
          case "soft_cushion":
            if (shoe.cushion_softness_1to5 >= 4) score += 8;
            break;
          case "lightweight":
            if (shoe.weight_g < 250) score += 8;
            break;
          case "stable":
            if (shoe.stability_1to5 >= 4) score += 8;
            break;
          case "smooth_rocker":
            if (shoe.rocker_1to5 >= 4) score += 8;
            break;
          case "long_run_comfort":
            if (shoeHasArchetype(shoe, 'daily_trainer')) score += 5;
            break;
          case "fast_feeling":
            if (shoe.weight_g < 240) score += 6;
            if (shoe.bounce_1to5 >= 4) score += 4;
            break;
          case "good_grip":
            if (shoe.wet_grip === "good" || shoe.wet_grip === "excellent") score += 5;
            break;
          // "comfortable_fit" - can't score, note for chat
        }
      }
    }

    // Process dislike tags - penalize similar
    if (currentShoe.sentiment === "dislike" && currentShoe.dislikeTags) {
      for (const tag of currentShoe.dislikeTags) {
        switch (tag) {
          case "too_heavy":
            if (shoe.weight_g > 280) score -= 12;
            break;
          case "too_soft":
            if (shoe.cushion_softness_1to5 === 5) score -= 12;
            break;
          case "too_firm":
            if (shoe.cushion_softness_1to5 <= 2) score -= 12;
            break;
          case "unstable":
            if (shoe.stability_1to5 <= 2) score -= 12;
            break;
          case "too_narrow":
            if (shoe.toe_box === "narrow") score -= 15;
            break;
          case "too_wide":
            if (shoe.toe_box === "roomy") score -= 15;
            break;
          case "slow_at_speed":
            if (shoe.bounce_1to5 <= 2) score -= 8;
            if (shoe.weight_g > 280) score -= 5;
            break;
          // "blisters", "wears_fast", "causes_pain" - flag for chat, no scoring
        }
      }
    }
  }

  return score;
}

/**
 * Trail preference scoring modifiers per SCORING_MODIFIERS.md
 */
function scoreTrailPreferenceModifiers(
  shoe: Shoe,
  profile?: RunnerProfile,
  requestedArchetype?: ShoeArchetype
): number {
  if (!profile?.trailRunning) return 0;

  let score = 0;
  const trailPref = profile.trailRunning;

  if (trailPref === "most_or_all") {
    if (requestedArchetype === "trail_shoe") {
      if (shoe.surface === "trail") score += 10;
      // road surface for trail request is excluded in hard filters
    }
    // Trail shoes recommended for non-trail archetype gets penalty
    if (requestedArchetype !== "trail_shoe" && shoe.surface === "trail") {
      score -= 5;
    }
  }

  if (trailPref === "infrequently") {
    if (requestedArchetype === "trail_shoe") {
      // Hybrids preferred
      if (shoe.surface === "mixed") score += 8;
      if (shoe.surface === "trail") score += 3;
    }
  }

  if (trailPref === "want_to_start") {
    if (requestedArchetype === "trail_shoe") {
      // Entry-level hybrids best
      if (shoe.surface === "mixed") score += 10;
      if (shoe.surface === "trail") score += 3;
    }
  }

  if (trailPref === "no_trails") {
    // Trail-only shoes excluded in hard filters
    // Road/trail hybrids get mild penalty
    if (shoe.surface === "mixed") score -= 5;
  }

  return score;
}

/**
 * Apply foot strike modifier based on heel geometry
 * Per SCORING_MODIFIERS.md
 */
function scoreFootStrikeMatch(shoe: Shoe, profile?: RunnerProfile): number {
  if (!profile?.footStrike) {
    return 0;
  }

  const footStrike = profile.footStrike;

  if (footStrike === "forefoot") {
    // Forefoot strikers prefer low drop and aggressive forefoot geometry
    if (shoe.heel_geometry === "aggressive_forefoot") return 10;
    if (shoe.heel_drop_mm <= 6) return 5;
    if (shoe.heel_drop_mm >= 10) return -10;
  }

  if (footStrike === "heel") {
    // Heel strikers prefer higher drop and NOT aggressive forefoot
    if (shoe.heel_geometry === "aggressive_forefoot") return -40; // Effectively exclude
    if (shoe.heel_drop_mm >= 8) return 10;
    if (shoe.heel_drop_mm <= 4) return -8;
    if (shoe.rocker_1to5 >= 3) return 5; // Rocker helps transition
  }

  if (footStrike === "midfoot") {
    // Midfoot strikers are flexible
    if (shoe.heel_drop_mm >= 4 && shoe.heel_drop_mm <= 10) return 3;
  }

  return 0;
}

/**
 * Calculate total score for a shoe
 * Applies all modifiers per SCORING_MODIFIERS.md
 */
export function scoreShoe(
  shoe: Shoe,
  constraints: RetrievalConstraints
): ScoredShoe {
  const requestedArchetype = constraints.archetypeContext || constraints.archetypes?.[0];

  // Base scores
  const archetypeScore = scoreArchetypeMatch(shoe, constraints.archetypes);
  const feelScore = scoreFeelMatch(shoe, constraints.feelPreferences, constraints.archetypeContext);
  const heelDropScore = scoreHeelDropMatch(shoe, constraints.feelPreferences);
  const stabilityBonus = scoreStabilityBonus(shoe, constraints.stabilityNeed);
  const availabilityBonus = scoreAvailability(shoe);

  // Profile-based modifiers (per SCORING_MODIFIERS.md)
  const footStrikeBonus = scoreFootStrikeMatch(shoe, constraints.profile);
  const experienceModifier = scoreExperienceModifiers(shoe, constraints.profile, requestedArchetype);
  const primaryGoalModifier = scorePrimaryGoalModifiers(shoe, constraints.profile, requestedArchetype);
  const runningPatternModifier = scoreRunningPatternModifiers(shoe, constraints.profile, requestedArchetype);
  const paceBucketModifier = scorePaceBucketModifiers(shoe, constraints.profile, requestedArchetype);
  const bmiModifier = scoreBMIModifiers(shoe, constraints.profile);
  const trailPreferenceModifier = scoreTrailPreferenceModifiers(shoe, constraints.profile, requestedArchetype);

  // Current shoe sentiment modifiers
  const loveDislikeModifier = scoreLoveDislikeTagModifiers(shoe, constraints.currentShoes);

  // Sum all scores (per spec: modifiers stack, minimum final score = 0)
  const totalScore = Math.max(0,
    archetypeScore +
    feelScore +
    heelDropScore +
    stabilityBonus +
    availabilityBonus +
    footStrikeBonus +
    experienceModifier +
    primaryGoalModifier +
    runningPatternModifier +
    paceBucketModifier +
    bmiModifier +
    trailPreferenceModifier +
    loveDislikeModifier
  );

  return {
    shoe,
    score: totalScore,
    breakdown: {
      archetypeScore,
      feelScore,
      stabilityBonus,
      availabilityBonus,
    },
  };
}

// ============================================================================
// CONSTRAINT RELAXATION
// ============================================================================

/**
 * Relax constraints if we're getting too few candidates
 */
function relaxConstraints(constraints: RetrievalConstraints): RetrievalConstraints {
  const relaxed = { ...constraints };

  // Step 1: Expand archetypes to include related archetypes
  if (relaxed.archetypes && relaxed.archetypes.length > 0) {
    const expandedArchetypes = new Set(relaxed.archetypes);
    for (const archetype of relaxed.archetypes) {
      const related = getRelatedArchetypes(archetype);
      related.forEach(r => expandedArchetypes.add(r));
    }
    relaxed.archetypes = Array.from(expandedArchetypes);
    return relaxed;
  }

  // Step 2: Remove feel preferences (keep stability needs)
  if (relaxed.feelPreferences) {
    delete relaxed.feelPreferences;
    return relaxed;
  }

  return relaxed;
}

/**
 * Get fallback shoes when constraints are too restrictive
 */
function getFallbackCandidates(catalogue: Shoe[], count: number = 10): Shoe[] {
  return catalogue
    .filter(shoe =>
      shoeHasArchetype(shoe, 'daily_trainer') &&
      shoe.release_status === "available"
    )
    .sort((a, b) => {
      // Sort by stability (stable neutrals first) and lower weight
      const stabilityDiff = b.stability_1to5 - a.stability_1to5;
      if (stabilityDiff !== 0) return stabilityDiff;
      return a.weight_g - b.weight_g;
    })
    .slice(0, count);
}

// ============================================================================
// MAIN RETRIEVAL FUNCTION
// ============================================================================

/**
 * Get candidate shoes from catalogue based on constraints
 * Returns 20-30 scored and sorted candidates
 */
export function getCandidates(
  constraints: RetrievalConstraints,
  catalogue: Shoe[]
): Shoe[] {
  console.log('[getCandidates] Called with archetypes:', constraints.archetypes);
  console.log('[getCandidates] Catalogue size:', catalogue?.length);

  // Edge case: empty catalogue
  if (!catalogue || catalogue.length === 0) {
    console.warn('[getCandidates] Empty catalogue!');
    return [];
  }

  // Default archetypes to "daily_trainer" if none specified
  const effectiveConstraints = {
    ...constraints,
    archetypes: constraints.archetypes && constraints.archetypes.length > 0
      ? constraints.archetypes
      : ['daily_trainer' as ShoeArchetype],
  };
  console.log('[getCandidates] Effective archetypes:', effectiveConstraints.archetypes);

  // Apply hard filters
  const filtered = catalogue.filter(shoe =>
    passesHardFilters(shoe, effectiveConstraints)
  );
  console.log('[getCandidates] After hard filters:', filtered.length, 'candidates');

  // If we have too few candidates after hard filtering, try relaxing
  if (filtered.length < 10) {
    const relaxed = relaxConstraints(effectiveConstraints);
    const relaxedFiltered = catalogue.filter(shoe =>
      passesHardFilters(shoe, relaxed)
    );

    if (relaxedFiltered.length > filtered.length) {
      const scored = relaxedFiltered.map(shoe =>
        scoreShoe(shoe, relaxed)
      );
      scored.sort((a, b) => b.score !== a.score ? b.score - a.score : a.shoe.shoe_id.localeCompare(b.shoe.shoe_id));
      return scored.slice(0, 30).map(s => s.shoe);
    }

    // If still too few, return fallback
    if (filtered.length < 3) {
      return getFallbackCandidates(catalogue, 10);
    }
  }

  // Score all filtered candidates
  const scored = filtered.map(shoe =>
    scoreShoe(shoe, effectiveConstraints)
  );

  // Deterministic sorting - score descending, shoe_id ascending as tiebreaker
  scored.sort((a, b) => b.score !== a.score ? b.score - a.score : a.shoe.shoe_id.localeCompare(b.shoe.shoe_id));

  // Return top 30 candidates (or fewer if we don't have 30)
  const topCandidates = scored.slice(0, 30);

  return topCandidates.map(s => s.shoe);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get detailed scoring breakdown for a shoe (useful for debugging)
 */
export function getScoreBreakdown(
  shoe: Shoe,
  constraints: RetrievalConstraints
): ScoredShoe {
  return scoreShoe(shoe, constraints);
}

/**
 * Check if a shoe would pass hard filters (useful for validation)
 */
export function wouldPassFilters(
  shoe: Shoe,
  constraints: RetrievalConstraints
): boolean {
  return passesHardFilters(shoe, constraints);
}
