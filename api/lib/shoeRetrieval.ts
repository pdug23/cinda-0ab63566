// ============================================================================
// SHOE RETRIEVAL LOGIC
// Filters and scores the 72-shoe catalogue to return 20-30 candidates
// ============================================================================

import type { Shoe, ShoeRole, FeelPreference } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface RetrievalConstraints {
  roles?: ShoeRole[];
  stabilityNeed?: "neutral" | "stability" | "stable_feel";
  feelPreferences?: {
    softVsFirm: FeelPreference | number[];
    stableVsNeutral: FeelPreference | number[];
    bouncyVsDamped: FeelPreference | number[];
  };
  excludeShoeIds?: string[];
  brandOnly?: string;
}

interface ScoredShoe {
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
// ROLE MAPPING HELPERS
// ============================================================================

/**
 * Maps ShoeRole to the corresponding use_* boolean field in shoebase.json
 */
function getRoleField(role: ShoeRole): keyof Shoe {
  const roleMap: Record<ShoeRole, keyof Shoe> = {
    'daily': 'use_daily',
    'easy': 'use_easy_recovery',
    'long': 'use_long_run',
    'tempo': 'use_tempo_workout',
    'intervals': 'use_speed_intervals',
    'race': 'use_race',
    'trail': 'use_trail',
  };
  return roleMap[role];
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
// PREFERENCE NORMALIZATION
// ============================================================================

/**
 * Convert single value or array to range for flexible matching
 *
 * Range logic:
 * - 1 → [1, 2] (extreme: very soft/stable/bouncy - narrow range)
 * - 2 → [1, 2, 3] (soft/stable/bouncy side - wider range)
 * - 3 → [2, 3, 4] (balanced - exclude extremes)
 * - 4 → [3, 4, 5] (firm/neutral/damped side - wider range)
 * - 5 → [4, 5] (extreme: very firm/neutral/damped - narrow range)
 * - default → [2, 3, 4] (exclude extremes, "not sure" fallback)
 *
 * This provides flexible matching while respecting user intent:
 * - Extreme picks get narrow ranges (strong preference)
 * - Middle picks get wider ranges (more flexible)
 * - Excludes extremes for balanced/unsure picks
 */
function normalizePreference(value: number | number[]): number[] {
  // If already array, return as-is (explicit range from frontend)
  if (Array.isArray(value)) {
    return value;
  }

  // Convert single value to range
  switch (value) {
    case 1: return [1, 2];       // Very soft/stable/bouncy
    case 2: return [1, 2, 3];    // Soft/stable/bouncy side
    case 3: return [2, 3, 4];    // Balanced (exclude extremes)
    case 4: return [3, 4, 5];    // Firm/neutral/damped side
    case 5: return [4, 5];       // Very firm/neutral/damped
    default: return [2, 3, 4];   // Fallback: exclude extremes
  }
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

  // Filter 3: Trail vs Road separation (CRITICAL - never mix)
  if (roles && roles.length > 0) {
    const requestingTrail = roles.includes('trail');
    const requestingRoad = roles.some(isRoadRole);

    if (requestingTrail && !shoe.use_trail) {
      return false; // Need trail shoe but this isn't one
    }

    if (requestingRoad && shoe.use_trail && !requestingTrail) {
      return false; // Need road shoe but this is trail-only
    }
  }

  return true;
}

// ============================================================================
// SOFT SCORING
// ============================================================================

/**
 * Score how well shoe matches requested roles (0-40 points)
 */
function scoreRoleMatch(shoe: Shoe, roles: ShoeRole[] = []): number {
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
 * Score how well shoe's feel matches preferences (0-30 points)
 * Uses range-based matching for flexible scoring
 */
function scoreFeelMatch(
  shoe: Shoe,
  prefs?: {
    softVsFirm: FeelPreference | number[];
    stableVsNeutral: FeelPreference | number[];
    bouncyVsDamped: FeelPreference | number[];
  }
): number {
  if (!prefs) {
    return 15; // Neutral score if no preferences
  }

  // Convert preferences to ranges for flexible matching
  const softRange = normalizePreference(prefs.softVsFirm);
  const stableRange = normalizePreference(prefs.stableVsNeutral);
  const bounceRange = normalizePreference(prefs.bouncyVsDamped);

  // Score each dimension (0-10 points per dimension)
  // If shoe falls within range: 10 points
  // If shoe is 1 away from range: 5 points
  // Otherwise: 0 points
  let softScore = 0;
  if (softRange.includes(shoe.cushion_softness_1to5)) {
    softScore = 10; // Perfect match: in range
  } else if (
    softRange.includes(shoe.cushion_softness_1to5 - 1) ||
    softRange.includes(shoe.cushion_softness_1to5 + 1)
  ) {
    softScore = 5; // Close: adjacent to range
  }

  let stabilityScore = 0;
  if (stableRange.includes(shoe.stability_1to5)) {
    stabilityScore = 10;
  } else if (
    stableRange.includes(shoe.stability_1to5 - 1) ||
    stableRange.includes(shoe.stability_1to5 + 1)
  ) {
    stabilityScore = 5;
  }

  let bounceScore = 0;
  if (bounceRange.includes(shoe.bounce_1to5)) {
    bounceScore = 10;
  } else if (
    bounceRange.includes(shoe.bounce_1to5 - 1) ||
    bounceRange.includes(shoe.bounce_1to5 + 1)
  ) {
    bounceScore = 5;
  }

  return softScore + stabilityScore + bounceScore;
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
 * Calculate total score for a shoe (0-100)
 */
function scoreShoe(
  shoe: Shoe,
  constraints: RetrievalConstraints
): ScoredShoe {
  const roleScore = scoreRoleMatch(shoe, constraints.roles);
  const feelScore = scoreFeelMatch(shoe, constraints.feelPreferences);
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
  // Edge case: empty catalogue
  if (!catalogue || catalogue.length === 0) {
    return [];
  }

  // Default roles to "daily" if none specified
  const effectiveConstraints = {
    ...constraints,
    roles: constraints.roles && constraints.roles.length > 0
      ? constraints.roles
      : ['daily' as ShoeRole],
  };

  // Apply hard filters
  const filtered = catalogue.filter(shoe =>
    passesHardFilters(shoe, effectiveConstraints)
  );

  // If we have too few candidates, try relaxing constraints
  if (filtered.length < 15) {
    const relaxed = relaxConstraints(effectiveConstraints);
    const relaxedFiltered = catalogue.filter(shoe =>
      passesHardFilters(shoe, relaxed)
    );

    // If relaxing helped, use relaxed results
    if (relaxedFiltered.length >= filtered.length * 1.5) {
      return getCandidates(relaxed, catalogue);
    }

    // If still too few, return fallback
    if (filtered.length < 5) {
      return getFallbackCandidates(catalogue, 10);
    }
  }

  // Score all filtered candidates
  const scored = filtered.map(shoe =>
    scoreShoe(shoe, effectiveConstraints)
  );

  // Sort by score descending (best matches first)
  scored.sort((a, b) => b.score - a.score);

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
