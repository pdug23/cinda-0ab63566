// ============================================================================
// SHOE RETRIEVAL LOGIC
// Filters and scores the 72-shoe catalogue to return 20-30 candidates
// ============================================================================

import type { Shoe, ShoeRole, FeelPreferences, PreferenceValue, HeelDropPreference } from '../types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RetrievalConstraints {
  roles?: ShoeRole[];
  roleContext?: ShoeRole | string; // Current role context for cinda_decides mode
  stabilityNeed?: "neutral" | "stability" | "stable_feel";
  feelPreferences?: FeelPreferences;
  excludeShoeIds?: string[];
  brandOnly?: string;
}

export interface ScoredShoe {
  shoe: Shoe;
  score: number;
  breakdown?: {
    roleScore: number;
    feelScore: number;
    stabilityBonus: number;
    availabilityBonus: number;
  };
}

// ============================================================================
// CENTRALIZED ROLE NORMALIZATION (Fix #4)
// Single source of truth for frontend→backend role mapping
// ============================================================================

/**
 * Normalize frontend role names to backend role names
 * Frontend uses: recovery, daily_trainer, race_day, not_sure
 * Backend uses: easy, daily, race, daily
 */
export function normalizeRole(role: string | undefined): ShoeRole {
  if (!role) return 'daily';
  const normalized = role.toLowerCase();
  const roleMap: Record<string, ShoeRole> = {
    'recovery': 'easy',
    'daily_trainer': 'daily',
    'race_day': 'race',
    'not_sure': 'daily',
    // Standard backend roles (pass through)
    'daily': 'daily',
    'easy': 'easy',
    'long': 'long',
    'tempo': 'tempo',
    'intervals': 'intervals',
    'race': 'race',
    'trail': 'trail',
  };
  return roleMap[normalized] || 'daily';
}

// ============================================================================
// ROLE MAPPING HELPERS
// ============================================================================

/**
 * Maps ShoeRole to the corresponding use_* boolean field in shoebase.json
 * Includes frontend role aliases (recovery, daily_trainer, race_day, etc.)
 */
function getRoleField(role: ShoeRole | string): keyof Shoe | undefined {
  const roleMap: Record<string, keyof Shoe> = {
    // Standard backend roles
    'daily': 'use_daily',
    'easy': 'use_easy_recovery',
    'long': 'use_long_run',
    'tempo': 'use_tempo_workout',
    'intervals': 'use_speed_intervals',
    'race': 'use_race',
    'trail': 'use_trail',
    // Frontend role aliases (CRITICAL - frontend sends these strings)
    'recovery': 'use_easy_recovery',       // Frontend uses "recovery" 
    'daily_trainer': 'use_daily',          // Frontend uses "daily_trainer"
    'race_day': 'use_race',                // Frontend uses "race_day"
    'not_sure': 'use_daily',               // Default to daily
  };
  const result = roleMap[role.toLowerCase()];
  if (!result) {
    console.warn('[getRoleField] Unknown role:', role, '- defaulting to use_daily');
    return 'use_daily'; // Fallback instead of undefined
  }
  return result;
}

/**
 * Check if a role is road-focused (not trail)
 */
function isRoadRole(role: ShoeRole): boolean {
  return role !== 'trail';
}

/**
 * Get related roles for fallback expansion
 * E.g., if looking for "tempo", also consider "daily" as they overlap
 */
function getRelatedRoles(role: ShoeRole): ShoeRole[] {
  const relatedMap: Record<ShoeRole, ShoeRole[]> = {
    'daily': ['easy', 'long'],
    'easy': ['daily', 'long'],
    'long': ['daily', 'easy'],
    'tempo': ['daily', 'intervals'],
    'intervals': ['tempo', 'race'],
    'race': ['intervals'],
    'trail': [], // Trail doesn't mix with road
  };
  return relatedMap[role] || [];
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
  const { roles, excludeShoeIds, brandOnly } = constraints;

  // Filter 1: Exclude shoes already in rotation
  if (excludeShoeIds && excludeShoeIds.includes(shoe.shoe_id)) {
    return false;
  }

  // Filter 2: Brand filtering (case-insensitive)
  if (brandOnly && shoe.brand.toLowerCase() !== brandOnly.toLowerCase()) {
    return false;
  }

  // Filter 3: Exclude budget-tier shoes by default (Bug 4 fix)
  if (shoe.retail_price_category === 'Budget') {
    return false;
  }

  // Filter 4: Trail vs Road separation (CRITICAL - never mix)
  if (roles && roles.length > 0) {
    const requestingTrail = roles.includes('trail');
    const requestingRoad = roles.some(isRoadRole);

    if (requestingTrail && !shoe.use_trail) {
      return false; // Need trail shoe but this isn't one
    }

    if (requestingRoad && shoe.use_trail && !requestingTrail) {
      return false; // Need road shoe but this is trail-only
    }

    // Filter 5: HARD FILTER by role flags (Bug 2 fix - CRITICAL)
    // Shoe must match at least ONE of the requested roles
    const matchesAnyRole = roles.some(role => {
      const field = getRoleField(role);
      if (!field) {
        console.warn('[passesHardFilters] No field for role:', role);
        return false;
      }
      const matches = shoe[field] === true;
      return matches;
    });

    if (!matchesAnyRole) {
      return false; // Shoe doesn't match any requested role
    }
  }

  return true;
}

// ============================================================================
// SOFT SCORING
// ============================================================================

/**
 * Score how well shoe matches requested roles (0-40 points)
 * EXPORTED for unified scoring across recommendationEngine.ts
 */
export function scoreRoleMatch(shoe: Shoe, roles: ShoeRole[] = []): number {
  if (roles.length === 0) {
    // No roles specified - treat as daily trainer search
    return shoe.use_daily ? 25 : 0;
  }

  // Point values for each role
  const rolePoints: Record<ShoeRole, number> = {
    'daily': 10,
    'easy': 8,
    'long': 10,
    'tempo': 12,
    'intervals': 10,
    'race': 8,
    'trail': 15,
  };

  let score = 0;
  for (const role of roles) {
    const field = getRoleField(role);
    if (shoe[field] === true) {
      score += rolePoints[role];
    }
  }

  // Cap at 40 points
  return Math.min(score, 40);
}

/**
 * Get role-based default preference values for cinda_decides mode
 * Returns the target value that Cinda would pick for each role
 * Fix #6: Tempo bounce defaults to 4-5 (high bounce for performance)
 */
function getRoleDefault(dimension: 'cushion' | 'stability' | 'bounce' | 'rocker' | 'groundFeel', role?: ShoeRole | string): number {
  const normalizedRole = normalizeRole(role);

  const defaults: Record<string, Record<ShoeRole, number>> = {
    cushion: {
      daily: 3, easy: 4, long: 4, tempo: 2, intervals: 2, race: 2, trail: 3
    },
    stability: {
      daily: 3, easy: 3, long: 3, tempo: 2, intervals: 2, race: 2, trail: 4
    },
    bounce: {
      // Fix #6: Tempo/intervals/race require high bounce (4-5)
      daily: 3, easy: 2, long: 3, tempo: 5, intervals: 5, race: 5, trail: 2
    },
    rocker: {
      daily: 3, easy: 2, long: 3, tempo: 4, intervals: 4, race: 5, trail: 2
    },
    groundFeel: {
      daily: 3, easy: 2, long: 2, tempo: 3, intervals: 4, race: 4, trail: 4
    }
  };

  return defaults[dimension]?.[normalizedRole] ?? 3;
}

/**
 * Ordered list of heel drop ranges for distance calculation
 */
const HEEL_DROP_RANGES: Array<"0mm" | "1-4mm" | "5-8mm" | "9-12mm" | "12mm+"> =
  ["0mm", "1-4mm", "5-8mm", "9-12mm", "12mm+"];

/**
 * Calculate distance from shoe's heel drop to user's selected ranges
 * Returns 0 for perfect match, 1 for adjacent range, 2+ for further
 */
function getHeelDropRangeDistance(
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

  return minDistance; // 0, 1, 2, 3, or 4
}

/**
 * Check if shoe heel drop falls within selected ranges
 */
function matchesHeelDropRange(heelDropMm: number, ranges: string[]): boolean {
  for (const range of ranges) {
    switch (range) {
      case '0mm': if (heelDropMm === 0) return true; break;
      case '1-4mm': if (heelDropMm >= 1 && heelDropMm <= 4) return true; break;
      case '5-8mm': if (heelDropMm >= 5 && heelDropMm <= 8) return true; break;
      case '9-12mm': if (heelDropMm >= 9 && heelDropMm <= 12) return true; break;
      case '12mm+': if (heelDropMm > 12) return true; break;
    }
  }
  return false;
}

/**
 * Score how well shoe's feel matches preferences (0-60 points)
 * Handles 3 modes: cinda_decides, user_set, wildcard
 * 
 * - cinda_decides: Use role-based intelligent defaults
 * - user_set: Match strictly to user's value
 * - wildcard: Skip this dimension entirely
 * 
 * EXPORTED for unified scoring across recommendationEngine.ts
 */
export function scoreFeelMatch(
  shoe: Shoe,
  prefs?: FeelPreferences,
  roleContext?: ShoeRole | string
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

    let targetValue: number;
    if (pref.mode === 'user_set' && pref.value !== undefined) {
      // Bug 1 fix: User slider uses SAME scale as shoebase (1=minimal, 5=max)
      // DO NOT INVERT - user value maps directly to shoebase value
      targetValue = pref.value;
    } else {
      // cinda_decides - use role-based default (already in shoebase scale)
      targetValue = getRoleDefault(dimension, roleContext);
    }

    dimensionsScored++;
    const distance = Math.abs(shoeValue - targetValue);
    // 10 points for perfect match, -2 per distance
    return Math.max(0, 10 - distance * 2);
  };

  // Score each dimension
  totalScore += scoreDimension(shoe.cushion_softness_1to5, prefs.cushionAmount, 'cushion');
  totalScore += scoreDimension(shoe.stability_1to5, prefs.stabilityAmount, 'stability');
  totalScore += scoreDimension(shoe.bounce_1to5, prefs.energyReturn, 'bounce');
  totalScore += scoreDimension(shoe.rocker_1to5, prefs.rocker, 'rocker');
  totalScore += scoreDimension(shoe.ground_feel_1to5, prefs.groundFeel, 'groundFeel');

  // NOTE: Heel drop is NOT scored here - it's applied AFTER normalization below
  // This ensures heel drop preference has proper weight

  // Normalize to 60 point scale if dimensions were scored
  if (dimensionsScored === 0) {
    return 30; // No preferences set, neutral score
  }

  // Scale score: max possible is dimensionsScored * 10
  const maxPossible = dimensionsScored * 10;
  let feelScore = Math.round((totalScore / maxPossible) * 60);

  // Apply heel drop bucketing AFTER normalization (user_set mode only)
  // This ensures shoes with preferred heel drop rank first
  const heelPref = prefs.heelDropPreference;
  console.log('[Heel Drop Debug] Shoe:', shoe.full_name, 'Drop:', shoe.heel_drop_mm, 'Mode:', heelPref?.mode);

  if (heelPref.mode === 'user_set' && heelPref.values && heelPref.values.length > 0) {
    const distance = getHeelDropRangeDistance(shoe.heel_drop_mm, heelPref.values);
    const bonus = distance === 0 ? 100 : distance === 1 ? 25 : -50;
    console.log('[Heel Drop] Selected ranges:', heelPref.values, 'Distance:', distance, 'Bonus applied:', bonus);
    feelScore += bonus;
  }
  // cinda_decides/wildcard modes: no heel drop adjustment needed

  console.log('[Final Score] Shoe:', shoe.full_name, 'Feel score after heel drop:', feelScore);
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
    return 15; // Perfect match for stability shoe
  }

  if (stabilityNeed === "stability" && shoe.support_type === "max_stability") {
    return 12; // Also good for stability needs
  }

  if (stabilityNeed === "stable_feel" && shoe.stability_1to5 >= 4) {
    return 10; // High stability feel
  }

  return 0;
}

/**
 * Apply availability bonus (0-15 points)
 * Prefer available shoes over discontinued/regional
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
  // discontinued = 0
  return 0;
}

/**
 * Calculate total score for a shoe (0-130 max)
 * EXPORTED as single source of truth for all scoring
 * Components: roleScore (0-40) + feelScore (0-60) + stabilityBonus (0-15) + availabilityBonus (0-15)
 */
export function scoreShoe(
  shoe: Shoe,
  constraints: RetrievalConstraints
): ScoredShoe {
  const roleScore = scoreRoleMatch(shoe, constraints.roles);
  const feelScore = scoreFeelMatch(shoe, constraints.feelPreferences, constraints.roleContext);
  const stabilityBonus = scoreStabilityBonus(shoe, constraints.stabilityNeed);
  const availabilityBonus = scoreAvailability(shoe);

  const totalScore = roleScore + feelScore + stabilityBonus + availabilityBonus;

  return {
    shoe,
    score: totalScore,
    breakdown: {
      roleScore,
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
 * Returns a new constraints object with relaxed rules
 */
function relaxConstraints(constraints: RetrievalConstraints): RetrievalConstraints {
  const relaxed = { ...constraints };

  // Step 1: Remove brand filter
  if (relaxed.brandOnly) {
    delete relaxed.brandOnly;
    return relaxed;
  }

  // Step 2: Expand roles to include related roles
  if (relaxed.roles && relaxed.roles.length > 0) {
    const expandedRoles = new Set(relaxed.roles);
    for (const role of relaxed.roles) {
      const related = getRelatedRoles(role);
      related.forEach(r => expandedRoles.add(r));
    }
    relaxed.roles = Array.from(expandedRoles);
    return relaxed;
  }

  // Step 3: Remove feel preferences (keep stability needs)
  if (relaxed.feelPreferences) {
    delete relaxed.feelPreferences;
    return relaxed;
  }

  return relaxed;
}

/**
 * Get fallback shoes when constraints are too restrictive
 * Returns top shoes sorted by general appeal (daily trainers + available)
 */
function getFallbackCandidates(catalogue: Shoe[], count: number = 10): Shoe[] {
  return catalogue
    .filter(shoe => shoe.use_daily && shoe.release_status === "available")
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
 *
 * @param constraints - Filtering and scoring criteria
 * @param catalogue - Full shoe catalogue (72 shoes from shoebase.json)
 * @returns Array of shoes sorted by match quality (best first)
 */
export function getCandidates(
  constraints: RetrievalConstraints,
  catalogue: Shoe[]
): Shoe[] {
  console.log('[getCandidates] Called with roles:', constraints.roles);
  console.log('[getCandidates] Catalogue size:', catalogue?.length);

  // Edge case: empty catalogue
  if (!catalogue || catalogue.length === 0) {
    console.warn('[getCandidates] Empty catalogue!');
    return [];
  }

  // Default roles to "daily" if none specified
  const effectiveConstraints = {
    ...constraints,
    roles: constraints.roles && constraints.roles.length > 0
      ? constraints.roles
      : ['daily' as ShoeRole],
  };
  console.log('[getCandidates] Effective roles:', effectiveConstraints.roles);

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

    // EMERGENCY FIX: No recursive call - just use relaxed results directly
    // Previous recursive call caused infinite stack overflow
    if (relaxedFiltered.length > filtered.length) {
      // Score the relaxed filtered candidates and return them
      const scored = relaxedFiltered.map(shoe =>
        scoreShoe(shoe, relaxed)
      );
      // Fix #5: Deterministic sorting - score descending, shoe_id ascending as tiebreaker
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

  // Fix #5: Deterministic sorting - score descending, shoe_id ascending as tiebreaker
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
