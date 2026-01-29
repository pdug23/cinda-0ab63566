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
  CurrentShoe,
  ChatContext,
  FeelGapInfo,
  ContrastProfile
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
  feelGap?: FeelGapInfo; // Feel gap from rotation analysis - overrides cinda_decides defaults
  contrastWith?: ContrastProfile; // Favor shoes different from this profile (variety mode)
  excludeShoeIds?: string[];
  profile?: RunnerProfile; // For brand preferences and other profile-based filtering
  currentShoes?: CurrentShoe[]; // For love/dislike tag modifiers
  chatContext?: ChatContext; // For chat-extracted context (injuries, fit, climate, requests)
}

export interface ScoredShoe {
  shoe: Shoe;
  score: number;
  breakdown: {
    archetypeScore: number;
    feelScore: number;
    heelDropScore: number;
    stabilityBonus: number;
    availabilityBonus: number;
    superTrainerBonus: number;  // Bonus for super trainer versatility
    footStrikeScore: number;
    experienceScore: number;
    primaryGoalScore: number;
    runningPatternScore: number;
    paceBucketScore: number;
    bmiScore: number;
    trailScore: number;
    loveDislikeScore: number;
    chatContextScore: number;
    contrastScore: number;  // Bonus for variety (shoes different from current rotation)
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
  const { archetypes, excludeShoeIds, profile, chatContext } = constraints;

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

  // Filter 2b: Brand exclusions from chat context
  // If user said "Nike doesn't work for me" or hated a brand, exclude it
  if (chatContext?.pastShoes) {
    for (const pastShoe of chatContext.pastShoes) {
      if (pastShoe.brand && (pastShoe.sentiment === "disliked" || pastShoe.sentiment === "hated")) {
        console.log(`[passesHardFilters] Checking brand exclusion: pastShoe.brand="${pastShoe.brand}", shoe.brand="${shoe.brand}", sentiment="${pastShoe.sentiment}"`);
        if (pastShoe.brand.toLowerCase() === shoe.brand.toLowerCase()) {
          console.log(`[passesHardFilters] EXCLUDING ${shoe.full_name} - brand "${shoe.brand}" excluded by chat context`);
          return false;
        }
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
    // Super trainers can match daily_trainer, workout_shoe, and recovery_shoe
    const matchesAnyArchetype = archetypes.some(archetype => {
      if (shoeHasArchetype(shoe, archetype)) return true;
      // Super trainers can do everything except races
      if (shoe.is_super_trainer && archetype !== 'race_shoe' && archetype !== 'trail_shoe') {
        return true;
      }
      return false;
    });

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
 * Acceptable ranges for each feel dimension per archetype
 * Shoes within range all score equally well (+5)
 * Outside range: penalties based on distance from nearest edge
 */
const ARCHETYPE_FEEL_RANGES: Record<ShoeArchetype, Record<string, [number, number]>> = {
  daily_trainer: {
    cushion: [3, 5],      // Daily trainers can be moderate to max cushion
    stability: [2, 4],    // Neutral to moderate stability
    bounce: [2, 4],       // Moderate range
    rocker: [2, 4],       // Moderate range
    groundFeel: [2, 4],   // Moderate range
  },
  recovery_shoe: {
    cushion: [4, 5],      // Recovery needs plush cushion
    stability: [2, 4],    // Can be neutral to stable
    bounce: [2, 4],       // Not bouncy, but acceptable range
    rocker: [2, 4],       // Moderate range
    groundFeel: [1, 3],   // Less ground feel preferred
  },
  workout_shoe: {
    cushion: [1, 4],      // Firm to moderate (not max soft)
    stability: [1, 5],    // Full range acceptable
    bounce: [4, 5],       // Must be bouncy
    rocker: [2, 5],       // Moderate to aggressive
    groundFeel: [2, 5],   // More ground feel acceptable
  },
  race_shoe: {
    cushion: [1, 4],      // Firm to moderate (not max soft)
    stability: [1, 5],    // Full range acceptable
    bounce: [4, 5],       // Must be bouncy
    rocker: [2, 5],       // Moderate to aggressive
    groundFeel: [3, 5],   // Ground feel preferred
  },
  trail_shoe: {
    cushion: [2, 4],      // Moderate range
    stability: [3, 5],    // More stability preferred
    bounce: [2, 4],       // Moderate range
    rocker: [2, 4],       // Moderate range
    groundFeel: [3, 5],   // Ground feel important for trails
  },
};

/**
 * Get archetype-based acceptable range for a feel dimension
 * Returns [min, max] - shoes within this range all score equally well
 */
function getArchetypeRange(
  dimension: 'cushion' | 'stability' | 'bounce' | 'rocker' | 'groundFeel',
  archetype?: ShoeArchetype
): [number, number] {
  const arch = archetype ?? 'daily_trainer';
  return ARCHETYPE_FEEL_RANGES[arch]?.[dimension] ?? [2, 4]; // Default moderate range
}

/**
 * Calculate distance from a value to a range
 * Returns 0 if value is within range, otherwise distance to nearest edge
 */
function distanceFromRange(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 0;
  return value < min ? min - value : value - max;
}

/**
 * Convert distance to score for cinda_decides mode
 */
function distanceToScore(distance: number): number {
  if (distance === 0) return 5;    // In range or exact match
  if (distance === 1) return -2;   // 1 away from range
  if (distance === 2) return -5;   // 2 away from range
  return -10;                      // 3+ away from range
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
  archetypeContext?: ShoeArchetype,
  feelGap?: FeelGapInfo
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
      // CINDA DECIDES: Use feelGap if it matches this dimension, otherwise archetype ranges

      // Map dimension names to feelGap dimension names
      const dimensionToFeelGap: Record<string, FeelGapInfo['dimension']> = {
        'cushion': 'cushion',
        'stability': 'stability',
        'rocker': 'rocker',
        // bounce and groundFeel don't have feelGap equivalents
      };

      const feelGapDimension = dimensionToFeelGap[dimension];

      if (feelGap && feelGapDimension && feelGap.dimension === feelGapDimension) {
        // Use feelGap targetValue - this is the rotation analysis override (single target)
        const distance = Math.abs(shoeValue - feelGap.targetValue);
        const score = distanceToScore(distance);
        console.log(`[scoreFeelMatch] ${dimension}: feelGap target=${feelGap.targetValue}, shoe=${shoeValue}, distance=${distance}, score=${score}`);
        return score;
      } else {
        // Use archetype range - shoes within range all score equally well
        const [min, max] = getArchetypeRange(dimension, archetypeContext);
        const distance = distanceFromRange(shoeValue, min, max);
        const score = distanceToScore(distance);
        console.log(`[scoreFeelMatch] ${dimension}: range=[${min},${max}], shoe=${shoeValue}, inRange=${distance === 0}, distance=${distance}, score=${score}`);
        return score;
      }
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
 * Apply super trainer versatility bonus (0-10 points)
 * Super trainers are highly versatile and can handle recovery through hard intervals
 */
function scoreSuperTrainerBonus(shoe: Shoe): number {
  if (shoe.is_super_trainer) {
    return 10; // Versatility bonus for super trainers
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

// ============================================================================
// CHAT CONTEXT MODIFIERS
// ============================================================================

/**
 * Score based on injuries mentioned in chat
 * Boosts cushion/stability for injury-prone runners
 */
function scoreChatInjuryModifiers(shoe: Shoe, chatContext?: ChatContext): number {
  if (!chatContext?.injuries || chatContext.injuries.length === 0) return 0;

  let score = 0;

  for (const injury of chatContext.injuries) {
    if (!injury.current) continue; // Only score current injuries

    const injuryLower = injury.injury.toLowerCase();

    // Shin splints: boost cushion and stability
    if (injuryLower.includes("shin") || injuryLower.includes("tibia")) {
      if (shoe.cushion_softness_1to5 >= 4) score += 12;
      if (shoe.stability_1to5 >= 3) score += 8;
      if (shoe.cushion_softness_1to5 <= 2) score -= 10; // Penalize firm shoes
    }

    // Plantar fasciitis: boost cushion, stability, avoid minimal drop
    if (injuryLower.includes("plantar") || injuryLower.includes("heel pain")) {
      if (shoe.cushion_softness_1to5 >= 4) score += 12;
      if (shoe.stability_1to5 >= 3) score += 8;
      if (shoe.heel_drop_mm <= 4) score -= 10; // Low drop can aggravate PF
      if (shoe.heel_drop_mm >= 8) score += 5; // Higher drop can help
    }

    // Achilles issues: prefer higher drop, avoid aggressive forefoot
    if (injuryLower.includes("achilles")) {
      if (shoe.heel_drop_mm >= 8) score += 10;
      if (shoe.heel_drop_mm <= 4) score -= 12;
      if (shoe.heel_geometry === "aggressive_forefoot") score -= 15;
    }

    // Knee issues: boost cushion and stability
    if (injuryLower.includes("knee") || injuryLower.includes("it band") || injuryLower.includes("itb")) {
      if (shoe.cushion_softness_1to5 >= 4) score += 10;
      if (shoe.stability_1to5 >= 3) score += 10;
      if (shoe.stability_1to5 <= 2) score -= 8;
    }

    // Hip/back issues: boost cushion
    if (injuryLower.includes("hip") || injuryLower.includes("back") || injuryLower.includes("lower back")) {
      if (shoe.cushion_softness_1to5 >= 4) score += 10;
    }

    // Foot issues (metatarsal, Morton's): boost cushion, prefer roomy toe box
    if (injuryLower.includes("metatarsal") || injuryLower.includes("morton") || injuryLower.includes("ball of foot")) {
      if (shoe.cushion_softness_1to5 >= 4) score += 8;
      if (shoe.toe_box === "roomy" || shoe.toe_box === "wide") score += 10;
      if (shoe.toe_box === "narrow") score -= 12;
    }
  }

  return score;
}

/**
 * Score based on fit preferences from chat
 * Wide feet, narrow feet, volume issues
 */
function scoreChatFitModifiers(shoe: Shoe, chatContext?: ChatContext): number {
  if (!chatContext?.fit) return 0;

  let score = 0;
  const fit = chatContext.fit;

  // Width preferences
  if (fit.width === "wide" || fit.width === "extra_wide") {
    if (shoe.toe_box === "roomy" || shoe.toe_box === "wide") score += 12;
    if (shoe.width_options?.includes("wide")) score += 8;
    if (shoe.toe_box === "narrow") score -= 15;
    if (shoe.fit_volume === "snug" || shoe.fit_volume === "narrow") score -= 10;
  }

  if (fit.width === "narrow") {
    if (shoe.toe_box === "narrow") score += 10;
    if (shoe.fit_volume === "snug") score += 8;
    if (shoe.toe_box === "roomy" || shoe.toe_box === "wide") score -= 10;
  }

  // Volume preferences
  if (fit.volume === "high") {
    if (shoe.fit_volume === "roomy") score += 10;
    if (shoe.fit_volume === "snug" || shoe.fit_volume === "narrow") score -= 10;
  }

  if (fit.volume === "low") {
    if (shoe.fit_volume === "snug") score += 10;
    if (shoe.fit_volume === "roomy") score -= 8;
  }

  // Specific fit issues
  if (fit.issues) {
    for (const issue of fit.issues) {
      const issueLower = issue.toLowerCase();

      if (issueLower.includes("heel slip") || issueLower.includes("heel lockdown")) {
        // Can't easily score for this without heel data, but snug fit helps
        if (shoe.fit_volume === "snug") score += 5;
      }

      if (issueLower.includes("toe cramp") || issueLower.includes("toe box")) {
        if (shoe.toe_box === "roomy" || shoe.toe_box === "wide") score += 10;
        if (shoe.toe_box === "narrow") score -= 12;
      }

      if (issueLower.includes("blister")) {
        // Blisters often from too narrow or too loose - can't reliably score
      }
    }
  }

  return score;
}

/**
 * Score based on climate mentioned in chat
 * Wet conditions, hot weather
 */
function scoreChatClimateModifiers(shoe: Shoe, chatContext?: ChatContext): number {
  if (!chatContext?.climate) return 0;

  let score = 0;
  const climateLower = chatContext.climate.toLowerCase();

  // Wet/rainy conditions: boost good wet grip
  if (climateLower.includes("wet") || climateLower.includes("rain") || climateLower.includes("slippery")) {
    if (shoe.wet_grip === "excellent") score += 12;
    if (shoe.wet_grip === "good") score += 8;
    if (shoe.wet_grip === "poor") score -= 12;
    if (shoe.wet_grip === "average") score -= 3;
  }

  // Cold/winter conditions: wet grip important
  if (climateLower.includes("cold") || climateLower.includes("winter") || climateLower.includes("snow") || climateLower.includes("ice")) {
    if (shoe.wet_grip === "excellent") score += 10;
    if (shoe.wet_grip === "good") score += 6;
    if (shoe.wet_grip === "poor") score -= 10;
  }

  // Hot conditions: lighter weight preferred
  if (climateLower.includes("hot") || climateLower.includes("humid") || climateLower.includes("summer")) {
    if (shoe.weight_g < 250) score += 5;
    if (shoe.weight_g > 300) score -= 5;
  }

  return score;
}

/**
 * Score based on specific requests from chat
 * Lightweight, cushioned, fast, etc.
 */
function scoreChatRequestModifiers(shoe: Shoe, chatContext?: ChatContext): number {
  if (!chatContext?.requests || chatContext.requests.length === 0) return 0;

  let score = 0;

  for (const request of chatContext.requests) {
    const requestLower = request.toLowerCase();

    // Lightweight requests
    if (requestLower.includes("light") || requestLower.includes("lightweight")) {
      if (shoe.weight_g < 230) score += 12;
      else if (shoe.weight_g < 260) score += 6;
      else if (shoe.weight_g > 300) score -= 10;
    }

    // Cushion/soft requests
    if (requestLower.includes("cushion") || requestLower.includes("soft") || requestLower.includes("plush")) {
      if (shoe.cushion_softness_1to5 >= 4) score += 10;
      if (shoe.cushion_softness_1to5 <= 2) score -= 10;
    }

    // Firm/responsive requests
    if (requestLower.includes("firm") || requestLower.includes("responsive") || requestLower.includes("snappy")) {
      if (shoe.bounce_1to5 >= 4) score += 8;
      if (shoe.cushion_softness_1to5 <= 3) score += 5;
    }

    // Stability requests
    if (requestLower.includes("stable") || requestLower.includes("stability") || requestLower.includes("support")) {
      if (shoe.stability_1to5 >= 4) score += 10;
      if (shoe.stability_1to5 <= 2) score -= 8;
    }

    // Speed/fast requests
    if (requestLower.includes("fast") || requestLower.includes("speed") || requestLower.includes("racing")) {
      if (shoe.weight_g < 250) score += 8;
      if (shoe.bounce_1to5 >= 4) score += 6;
      if (shoe.has_plate) score += 5;
    }

    // Long run requests
    if (requestLower.includes("long run") || requestLower.includes("marathon") || requestLower.includes("distance")) {
      if (shoe.cushion_softness_1to5 >= 3) score += 5;
      if (shoeHasArchetype(shoe, 'daily_trainer')) score += 5;
    }

    // Recovery/easy requests
    if (requestLower.includes("recovery") || requestLower.includes("easy") || requestLower.includes("comfortable")) {
      if (shoe.cushion_softness_1to5 >= 4) score += 8;
      if (shoeHasArchetype(shoe, 'recovery_shoe')) score += 8;
    }

    // Bouncy requests
    if (requestLower.includes("bouncy") || requestLower.includes("energetic") || requestLower.includes("poppy")) {
      if (shoe.bounce_1to5 >= 4) score += 10;
      if (shoe.bounce_1to5 <= 2) score -= 8;
    }

    // Rocker requests
    if (requestLower.includes("rocker") || requestLower.includes("roll")) {
      if (shoe.rocker_1to5 >= 4) score += 10;
    }

    // Ground feel requests
    if (requestLower.includes("ground feel") || requestLower.includes("road feel") || requestLower.includes("connected")) {
      if (shoe.ground_feel_1to5 >= 4) score += 10;
      if (shoe.ground_feel_1to5 <= 2) score -= 8;
    }

    // Low drop requests
    if (requestLower.includes("low drop") || requestLower.includes("zero drop")) {
      if (shoe.heel_drop_mm <= 4) score += 10;
      if (shoe.heel_drop_mm >= 10) score -= 8;
    }
  }

  return score;
}

/**
 * Score based on past shoe sentiment from chat
 * If they loved/hated specific shoes, boost/penalize similar profiles
 */
function scoreChatPastShoeModifiers(shoe: Shoe, chatContext?: ChatContext): number {
  if (!chatContext?.pastShoes || chatContext.pastShoes.length === 0) return 0;

  let score = 0;

  for (const pastShoe of chatContext.pastShoes) {
    // Reason-based scoring (more specific than just brand/sentiment)
    if (pastShoe.reason) {
      const reasonLower = pastShoe.reason.toLowerCase();

      if (pastShoe.sentiment === "loved" || pastShoe.sentiment === "liked") {
        // Boost similar characteristics
        if (reasonLower.includes("cushion") || reasonLower.includes("soft")) {
          if (shoe.cushion_softness_1to5 >= 4) score += 6;
        }
        if (reasonLower.includes("bouncy") || reasonLower.includes("responsive")) {
          if (shoe.bounce_1to5 >= 4) score += 6;
        }
        if (reasonLower.includes("light")) {
          if (shoe.weight_g < 250) score += 6;
        }
        if (reasonLower.includes("stable")) {
          if (shoe.stability_1to5 >= 4) score += 6;
        }
      }

      if (pastShoe.sentiment === "disliked" || pastShoe.sentiment === "hated") {
        // Penalize similar characteristics
        if (reasonLower.includes("too soft") || reasonLower.includes("mushy")) {
          if (shoe.cushion_softness_1to5 >= 4) score -= 8;
        }
        if (reasonLower.includes("too firm") || reasonLower.includes("harsh")) {
          if (shoe.cushion_softness_1to5 <= 2) score -= 8;
        }
        if (reasonLower.includes("heavy")) {
          if (shoe.weight_g > 280) score -= 8;
        }
        if (reasonLower.includes("unstable") || reasonLower.includes("wobbly")) {
          if (shoe.stability_1to5 <= 2) score -= 8;
        }
        if (reasonLower.includes("narrow") || reasonLower.includes("tight")) {
          if (shoe.toe_box === "narrow") score -= 10;
        }
        if (reasonLower.includes("wide") || reasonLower.includes("sloppy")) {
          if (shoe.toe_box === "roomy" || shoe.toe_box === "wide") score -= 8;
        }
      }
    }
  }

  return score;
}

/**
 * Combined chat context scoring
 * Applies all chat-extracted modifiers
 */
function scoreChatContextModifiers(shoe: Shoe, chatContext?: ChatContext): number {
  if (!chatContext) return 0;

  return (
    scoreChatInjuryModifiers(shoe, chatContext) +
    scoreChatFitModifiers(shoe, chatContext) +
    scoreChatClimateModifiers(shoe, chatContext) +
    scoreChatRequestModifiers(shoe, chatContext) +
    scoreChatPastShoeModifiers(shoe, chatContext)
  );
}

/**
 * Score contrast bonus for variety recommendations
 * Rewards shoes that differ from current rotation profile
 */
function scoreContrastBonus(
  shoe: Shoe,
  contrastWith?: ContrastProfile
): number {
  if (!contrastWith) return 0;

  let bonus = 0;

  // Reward shoes that differ from current rotation averages
  // +10 for 2+ difference, +5 for 1 difference on each dimension
  if (contrastWith.cushion !== undefined) {
    const diff = Math.abs(shoe.cushion_softness_1to5 - contrastWith.cushion);
    if (diff >= 2) bonus += 10;
    else if (diff === 1) bonus += 5;
  }

  if (contrastWith.bounce !== undefined) {
    const diff = Math.abs(shoe.bounce_1to5 - contrastWith.bounce);
    if (diff >= 2) bonus += 10;
    else if (diff === 1) bonus += 5;
  }

  if (contrastWith.rocker !== undefined) {
    const diff = Math.abs(shoe.rocker_1to5 - contrastWith.rocker);
    if (diff >= 2) bonus += 10;
    else if (diff === 1) bonus += 5;
  }

  if (contrastWith.stability !== undefined) {
    const diff = Math.abs(shoe.stability_1to5 - contrastWith.stability);
    if (diff >= 2) bonus += 10;
    else if (diff === 1) bonus += 5;
  }

  if (contrastWith.groundFeel !== undefined) {
    const diff = Math.abs(shoe.ground_feel_1to5 - contrastWith.groundFeel);
    if (diff >= 2) bonus += 10;
    else if (diff === 1) bonus += 5;
  }

  if (bonus > 0) {
    console.log(`[scoreContrastBonus] ${shoe.model}: +${bonus} (differs from current rotation)`);
  }

  return bonus;
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
  const feelScore = scoreFeelMatch(shoe, constraints.feelPreferences, constraints.archetypeContext, constraints.feelGap);
  const heelDropScore = scoreHeelDropMatch(shoe, constraints.feelPreferences);
  const stabilityBonus = scoreStabilityBonus(shoe, constraints.stabilityNeed);
  const availabilityBonus = scoreAvailability(shoe);
  const superTrainerBonus = scoreSuperTrainerBonus(shoe);

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

  // Chat context modifiers (injuries, fit, climate, requests)
  const chatContextModifier = scoreChatContextModifiers(shoe, constraints.chatContext);

  // Contrast bonus for variety recommendations (Tier 3)
  const contrastBonus = scoreContrastBonus(shoe, constraints.contrastWith);

  // Sum all scores (per spec: modifiers stack, minimum final score = 0)
  const totalScore = Math.max(0,
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

  return {
    shoe,
    score: totalScore,
    breakdown: {
      archetypeScore,
      feelScore,
      heelDropScore,
      stabilityBonus,
      availabilityBonus,
      superTrainerBonus,
      footStrikeScore: footStrikeBonus,
      experienceScore: experienceModifier,
      primaryGoalScore: primaryGoalModifier,
      runningPatternScore: runningPatternModifier,
      paceBucketScore: paceBucketModifier,
      bmiScore: bmiModifier,
      trailScore: trailPreferenceModifier,
      loveDislikeScore: loveDislikeModifier,
      chatContextScore: chatContextModifier,
      contrastScore: contrastBonus,
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

  // DEBUG: Log what data we're receiving for modifiers
  console.log('[getCandidates] DEBUG - Profile data:', {
    hasProfile: !!constraints.profile,
    footStrike: constraints.profile?.footStrike,
    raceTime: constraints.profile?.raceTime,
    height: constraints.profile?.height,
    weight: constraints.profile?.weight,
    experience: constraints.profile?.experience,
    primaryGoal: constraints.profile?.primaryGoal,
    runningPattern: constraints.profile?.runningPattern,
    trailRunning: constraints.profile?.trailRunning,
    brandPreference: constraints.profile?.brandPreference,
  });
  console.log('[getCandidates] DEBUG - CurrentShoes data:', {
    hasCurrentShoes: !!constraints.currentShoes,
    count: constraints.currentShoes?.length || 0,
    shoes: constraints.currentShoes?.map(s => ({
      shoeId: s.shoeId,
      sentiment: s.sentiment,
      loveTags: s.loveTags,
      dislikeTags: s.dislikeTags,
    })),
  });
  console.log('[getCandidates] DEBUG - ChatContext data:', {
    hasChatContext: !!constraints.chatContext,
    injuries: constraints.chatContext?.injuries,
    pastShoes: constraints.chatContext?.pastShoes,
    fit: constraints.chatContext?.fit,
    climate: constraints.chatContext?.climate,
    requests: constraints.chatContext?.requests,
  });

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
      console.log('[getCandidates] Using relaxed constraints, now:', relaxedFiltered.length, 'candidates');
      const scored = relaxedFiltered.map(shoe =>
        scoreShoe(shoe, relaxed)
      );
      scored.sort((a, b) => b.score !== a.score ? b.score - a.score : a.shoe.shoe_id.localeCompare(b.shoe.shoe_id));

      // Log detailed breakdown for top 5 candidates (relaxed)
      console.log('[scoring] Top 5 candidates breakdown (relaxed constraints):');
      scored.slice(0, 5).forEach((s, idx) => {
        console.log(`[scoring] #${idx + 1} ${s.shoe.full_name}`, {
          finalScore: s.score,
          archetype: s.breakdown.archetypeScore,
          feel: s.breakdown.feelScore,
          heelDrop: s.breakdown.heelDropScore,
          stability: s.breakdown.stabilityBonus,
          availability: s.breakdown.availabilityBonus,
          footStrike: s.breakdown.footStrikeScore,
          experience: s.breakdown.experienceScore,
          primaryGoal: s.breakdown.primaryGoalScore,
          runningPattern: s.breakdown.runningPatternScore,
          paceBucket: s.breakdown.paceBucketScore,
          bmi: s.breakdown.bmiScore,
          trail: s.breakdown.trailScore,
          loveDislike: s.breakdown.loveDislikeScore,
          chatContext: s.breakdown.chatContextScore,
        });
      });

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

  // Log detailed breakdown for top 5 candidates
  console.log('[scoring] Top 5 candidates breakdown:');
  scored.slice(0, 5).forEach((s, idx) => {
    console.log(`[scoring] #${idx + 1} ${s.shoe.full_name}`, {
      finalScore: s.score,
      archetype: s.breakdown.archetypeScore,
      feel: s.breakdown.feelScore,
      heelDrop: s.breakdown.heelDropScore,
      stability: s.breakdown.stabilityBonus,
      availability: s.breakdown.availabilityBonus,
      footStrike: s.breakdown.footStrikeScore,
      experience: s.breakdown.experienceScore,
      primaryGoal: s.breakdown.primaryGoalScore,
      runningPattern: s.breakdown.runningPatternScore,
      paceBucket: s.breakdown.paceBucketScore,
      bmi: s.breakdown.bmiScore,
      trail: s.breakdown.trailScore,
      loveDislike: s.breakdown.loveDislikeScore,
      chatContext: s.breakdown.chatContextScore,
    });
  });

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
