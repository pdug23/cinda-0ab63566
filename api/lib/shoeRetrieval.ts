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
 * Score how well shoe's feel matches preferences (0-60 points)
 */
export function scoreFeelMatch(
  shoe: Shoe,
  prefs?: FeelPreferences,
  archetypeContext?: ShoeArchetype
): number {
  if (!prefs) {
    return 30; // Neutral score if no preferences
  }

  let totalScore = 0;
  let dimensionsScored = 0;

  // Helper to score a single dimension
  const scoreDimension = (
    shoeValue: number,
    pref: PreferenceValue,
    dimension: 'cushion' | 'stability' | 'bounce' | 'rocker' | 'groundFeel'
  ): number => {
    if (pref.mode === 'wildcard') {
      return 0; // Skip - no score contribution
    }

    dimensionsScored++;

    if (pref.mode === 'user_set' && pref.value !== undefined) {
      // USER SET: Strict penalties - user knows what they want
      const targetValue = pref.value;
      const distance = Math.abs(shoeValue - targetValue);

      if (distance === 0) return 10;      // Perfect match
      if (distance === 1) return 3;       // -7 penalty (off by 1)
      if (distance === 2) return -5;      // -15 penalty (off by 2)
      return -15;                         // -25 penalty (off by 3+)

    } else {
      // CINDA DECIDES: Softer penalties - we're optimizing holistically
      const targetValue = getArchetypeDefault(dimension, archetypeContext);
      const distance = Math.abs(shoeValue - targetValue);
      return Math.max(0, 10 - distance * 2);  // 10, 8, 6, 4, 2, 0
    }
  };

  // Score each dimension
  totalScore += scoreDimension(shoe.cushion_softness_1to5, prefs.cushionAmount, 'cushion');
  totalScore += scoreDimension(shoe.stability_1to5, prefs.stabilityAmount, 'stability');
  totalScore += scoreDimension(shoe.bounce_1to5, prefs.energyReturn, 'bounce');
  totalScore += scoreDimension(shoe.rocker_1to5, prefs.rocker, 'rocker');
  totalScore += scoreDimension(shoe.ground_feel_1to5, prefs.groundFeel, 'groundFeel');

  // Normalize to 60 point scale if dimensions were scored
  if (dimensionsScored === 0) {
    return 30; // No preferences set, neutral score
  }

  // Scale score: max possible is dimensionsScored * 10
  const maxPossible = dimensionsScored * 10;
  let feelScore = Math.round((totalScore / maxPossible) * 60);

  // Apply heel drop bucketing (user_set mode only)
  const heelPref = prefs.heelDropPreference;
  if (heelPref?.mode === 'user_set' && heelPref.values && heelPref.values.length > 0) {
    const distance = getHeelDropRangeDistance(shoe.heel_drop_mm, heelPref.values);
    const bonus = distance === 0 ? 100 : distance === 1 ? 25 : -50;
    feelScore += bonus;
  }

  return feelScore;
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

/**
 * Apply foot strike modifier based on heel geometry
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
 */
export function scoreShoe(
  shoe: Shoe,
  constraints: RetrievalConstraints
): ScoredShoe {
  const archetypeScore = scoreArchetypeMatch(shoe, constraints.archetypes);
  const feelScore = scoreFeelMatch(shoe, constraints.feelPreferences, constraints.archetypeContext);
  const stabilityBonus = scoreStabilityBonus(shoe, constraints.stabilityNeed);
  const availabilityBonus = scoreAvailability(shoe);
  const footStrikeBonus = scoreFootStrikeMatch(shoe, constraints.profile);

  const totalScore = archetypeScore + feelScore + stabilityBonus + availabilityBonus + footStrikeBonus;

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
