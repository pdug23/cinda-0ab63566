// ============================================================================
// RECOMMENDATION ENGINE
// Generates exactly 3 shoe recommendations that address the identified gap
// ============================================================================

import type {
  Gap,
  RunnerProfile,
  CurrentShoe,
  Shoe,
  RecommendedShoe,
  ShoeRole,
  RecommendationType
} from '../types';
import { getCandidates } from './shoeRetrieval';

// ============================================================================
// CONSTRAINT BUILDING
// ============================================================================

/**
 * Build retrieval constraints from the identified gap
 */
function buildConstraintsFromGap(
  gap: Gap,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[]
): {
  roles?: ShoeRole[];
  stabilityNeed?: "neutral" | "stability" | "stable_feel";
  feelPreferences?: typeof profile.feelPreferences;
  excludeShoeIds?: string[];
  brandOnly?: string;
} {
  const constraints: ReturnType<typeof buildConstraintsFromGap> = {
    feelPreferences: profile.feelPreferences,
    excludeShoeIds: currentShoes.map(s => s.shoeId),
  };

  // Determine stability need from profile
  if (profile.feelPreferences.stableVsNeutral >= 4) {
    constraints.stabilityNeed = "stable_feel";
  }

  switch (gap.type) {
    case "coverage":
      // Missing a specific role
      if (gap.missingCapability && gap.missingCapability !== "rotation variety") {
        const roleOptions: ShoeRole[] = ["daily", "easy", "long", "tempo", "intervals", "race", "trail"];
        if (roleOptions.includes(gap.missingCapability as ShoeRole)) {
          constraints.roles = [gap.missingCapability as ShoeRole];
        }
      }
      break;

    case "performance":
      // Need faster shoes
      constraints.roles = ["tempo", "intervals"];
      // Prefer responsive feel
      if (constraints.feelPreferences) {
        constraints.feelPreferences = {
          ...constraints.feelPreferences,
          bouncyVsDamped: 4, // More bouncy for performance
        };
      }
      break;

    case "recovery":
      // Need cushioned/protective shoes
      constraints.roles = ["easy", "daily"];
      // Prefer soft, stable feel
      if (constraints.feelPreferences) {
        constraints.feelPreferences = {
          ...constraints.feelPreferences,
          softVsFirm: 5, // Very soft
          stableVsNeutral: 4, // Stable
        };
      }
      break;

    case "redundancy":
      // Fill the missing capability
      if (gap.missingCapability && gap.missingCapability !== "rotation variety") {
        const roleOptions: ShoeRole[] = ["daily", "easy", "long", "tempo", "intervals", "race", "trail"];
        if (roleOptions.includes(gap.missingCapability as ShoeRole)) {
          constraints.roles = [gap.missingCapability as ShoeRole];
        }
      }
      break;
  }

  return constraints;
}

// ============================================================================
// GAP-SPECIFIC SCORING
// ============================================================================

/**
 * Score a shoe for how well it addresses the specific gap
 * Returns bonus points (0-50) to add to base retrieval score
 */
function scoreForGapFit(
  shoe: Shoe,
  gap: Gap,
  profile: RunnerProfile
): number {
  let bonus = 0;

  switch (gap.type) {
    case "coverage":
      // Matches the missing role
      if (gap.missingCapability) {
        const roleField = getRoleFieldFromCapability(gap.missingCapability);
        if (roleField && shoe[roleField] === true) {
          bonus += 20;
        }
      }
      // Versatile shoes (3+ use cases) are valuable
      const useCaseCount = [
        shoe.use_daily,
        shoe.use_easy_recovery,
        shoe.use_long_run,
        shoe.use_tempo_workout,
        shoe.use_speed_intervals,
        shoe.use_race,
      ].filter(Boolean).length;
      if (useCaseCount >= 3) bonus += 10;
      break;

    case "performance":
      // Has plate
      if (shoe.has_plate) bonus += 15;
      // Light weight
      if (shoe.weight_g < 240) bonus += 15;
      else if (shoe.weight_g < 260) bonus += 10;
      // High bounce
      if (shoe.bounce_1to5 >= 4) bonus += 10;
      else if (shoe.bounce_1to5 >= 3) bonus += 5;
      break;

    case "recovery":
      // Max cushion
      if (shoe.cushion_softness_1to5 === 5) bonus += 20;
      else if (shoe.cushion_softness_1to5 === 4) bonus += 10;
      // High stability
      if (shoe.stability_1to5 >= 4) bonus += 10;
      // Stable platform
      if (shoe.support_type === "stable_neutral" || shoe.support_type === "stability") {
        bonus += 10;
      }
      break;

    case "redundancy":
      // Fills missing capability
      if (gap.missingCapability) {
        const roleField = getRoleFieldFromCapability(gap.missingCapability);
        if (roleField && shoe[roleField] === true) {
          bonus += 20;
        }
      }
      // Different feel from redundant shoes is handled elsewhere
      break;
  }

  return bonus;
}

/**
 * Helper to map capability string to shoe field
 */
function getRoleFieldFromCapability(capability: string): keyof Shoe | null {
  const roleMap: Record<string, keyof Shoe> = {
    'daily': 'use_daily',
    'easy': 'use_easy_recovery',
    'long': 'use_long_run',
    'tempo': 'use_tempo_workout',
    'intervals': 'use_speed_intervals',
    'race': 'use_race',
    'trail': 'use_trail',
  };
  return roleMap[capability] || null;
}

// ============================================================================
// SHOE SELECTION
// ============================================================================

interface ScoredShoe {
  shoe: Shoe;
  totalScore: number;
}

/**
 * Check if two shoes are similar in feel and performance
 * Brand-agnostic - only considers performance attributes
 */
function areSimilar(shoe1: Shoe, shoe2: Shoe): boolean {
  // Check key feel dimensions (within 1 point = similar)
  const cushionDiff = Math.abs(shoe1.cushion_softness_1to5 - shoe2.cushion_softness_1to5);
  const bounceDiff = Math.abs(shoe1.bounce_1to5 - shoe2.bounce_1to5);
  const stabilityDiff = Math.abs(shoe1.stability_1to5 - shoe2.stability_1to5);

  // Weight similarity (within 30g)
  const weightDiff = Math.abs(shoe1.weight_g - shoe2.weight_g);

  // Construction similarity (both plated or both not)
  const sameConstruction = shoe1.has_plate === shoe2.has_plate;

  // Similar if: close on all 3 feel dimensions AND similar weight AND same construction
  return cushionDiff <= 1 &&
         bounceDiff <= 1 &&
         stabilityDiff <= 1 &&
         weightDiff <= 30 &&
         sameConstruction;
}

/**
 * Check if two shoes offer meaningfully different experiences
 * Brand-agnostic - requires 2+ performance differences
 */
function areDifferent(shoe1: Shoe, shoe2: Shoe): boolean {
  let differenceCount = 0;

  // Cushion difference (soft vs firm is a big difference)
  if (Math.abs(shoe1.cushion_softness_1to5 - shoe2.cushion_softness_1to5) >= 2) {
    differenceCount++;
  }

  // Bounce difference (bouncy vs damped is a big difference)
  if (Math.abs(shoe1.bounce_1to5 - shoe2.bounce_1to5) >= 2) {
    differenceCount++;
  }

  // Stability difference (stable vs neutral is a big difference)
  if (Math.abs(shoe1.stability_1to5 - shoe2.stability_1to5) >= 2) {
    differenceCount++;
  }

  // Weight class difference (40+ grams changes feel significantly)
  if (Math.abs(shoe1.weight_g - shoe2.weight_g) >= 40) {
    differenceCount++;
  }

  // Construction difference (plated vs unplated is huge)
  if (shoe1.has_plate !== shoe2.has_plate) {
    differenceCount++;
  }

  // Rocker difference (aggressive vs flat changes ride)
  if (Math.abs(shoe1.rocker_1to5 - shoe2.rocker_1to5) >= 2) {
    differenceCount++;
  }

  // Need at least 2 meaningful differences for a true trade-off
  return differenceCount >= 2;
}

/**
 * Select 3 diverse shoes from candidates
 * Returns [closeMatch1, closeMatch2, tradeOff]
 */
function selectDiverseThree(scoredCandidates: ScoredShoe[]): [Shoe, Shoe, Shoe] | null {
  if (scoredCandidates.length < 3) return null;

  // Sort by score descending
  const sorted = [...scoredCandidates].sort((a, b) => b.totalScore - a.totalScore);

  // Close Match 1: Highest scored
  const closeMatch1 = sorted[0].shoe;

  // Close Match 2: Next highest that is similar to #1
  let closeMatch2: Shoe | null = null;
  for (let i = 1; i < sorted.length; i++) {
    if (areSimilar(sorted[i].shoe, closeMatch1)) {
      closeMatch2 = sorted[i].shoe;
      break;
    }
  }

  // If no similar match found, just take second highest
  if (!closeMatch2 && sorted.length >= 2) {
    closeMatch2 = sorted[1].shoe;
  }

  // Trade-off: Highest scored that is different from both #1 and #2
  let tradeOff: Shoe | null = null;
  for (const candidate of sorted) {
    if (candidate.shoe.shoe_id === closeMatch1.shoe_id) continue;
    if (closeMatch2 && candidate.shoe.shoe_id === closeMatch2.shoe_id) continue;

    if (areDifferent(candidate.shoe, closeMatch1) &&
        (!closeMatch2 || areDifferent(candidate.shoe, closeMatch2))) {
      tradeOff = candidate.shoe;
      break;
    }
  }

  // If no different option found, take third highest
  if (!tradeOff) {
    for (const candidate of sorted) {
      if (candidate.shoe.shoe_id !== closeMatch1.shoe_id &&
          (!closeMatch2 || candidate.shoe.shoe_id !== closeMatch2.shoe_id)) {
        tradeOff = candidate.shoe;
        break;
      }
    }
  }

  if (!closeMatch2 || !tradeOff) return null;

  return [closeMatch1, closeMatch2, tradeOff];
}

// ============================================================================
// EXPLANATION GENERATION
// ============================================================================

/**
 * Generate match reason (why this shoe fills the gap)
 */
function generateMatchReason(shoe: Shoe, gap: Gap): string {
  switch (gap.type) {
    case "coverage":
      if (gap.missingCapability === "tempo") {
        return `Responsive trainer with ${shoe.has_plate ? 'plate for snappy' : 'firm foam for efficient'} tempo efforts`;
      }
      if (gap.missingCapability === "easy") {
        return `Cushioned recovery shoe for easy days and building mileage safely`;
      }
      if (gap.missingCapability === "long") {
        return `Protective long-run shoe with comfort for sustained miles`;
      }
      if (gap.missingCapability === "race") {
        return `Carbon-plated race shoe for maximum efficiency on race day`;
      }
      if (gap.missingCapability === "daily") {
        return `Versatile daily trainer for most of your weekly mileage`;
      }
      if (gap.missingCapability === "intervals") {
        return `Lightweight speed shoe for track workouts and fast efforts`;
      }
      return `Versatile shoe that rounds out your rotation`;

    case "performance":
      return `${shoe.has_plate ? 'Plated' : 'Responsive'} shoe for faster-paced training and workouts`;

    case "recovery":
      return `Max-cushion shoe for recovery days and protecting tired legs`;

    case "redundancy":
      return `Different approach from your current shoes to add versatility`;

    default:
      return `Well-rounded option for your rotation`;
  }
}

/**
 * Extract key strengths from shoe (2-3 bullet points)
 */
function extractKeyStrengths(shoe: Shoe, gap: Gap): string[] {
  const strengths: string[] = [];

  // Cushioning
  if (shoe.cushion_softness_1to5 >= 4) {
    strengths.push(`Soft, protective ${shoe.cushion_softness_1to5 === 5 ? 'max-' : ''}cushion ride`);
  } else if (shoe.cushion_softness_1to5 <= 2) {
    strengths.push(`Firm, responsive platform for efficiency`);
  }

  // Plate tech
  if (shoe.has_plate && shoe.plate_tech_name) {
    strengths.push(`${shoe.plate_tech_name} adds snap and propulsion`);
  } else if (shoe.has_plate) {
    strengths.push(`${shoe.plate_material || 'Plate'} adds snap for faster paces`);
  }

  // Weight
  if (shoe.weight_g < 240) {
    strengths.push(`Lightweight (${shoe.weight_g}g) for nimble feel`);
  }

  // Stability
  if (shoe.stability_1to5 >= 4) {
    strengths.push(`Stable platform prevents excessive motion`);
  }

  // Bounce
  if (shoe.bounce_1to5 >= 4) {
    strengths.push(`Energetic, bouncy foam returns energy`);
  }

  // Versatility
  const useCases = [
    shoe.use_daily && 'daily',
    shoe.use_easy_recovery && 'easy',
    shoe.use_long_run && 'long',
    shoe.use_tempo_workout && 'tempo',
  ].filter(Boolean);
  if (useCases.length >= 3) {
    strengths.push(`Versatile across ${useCases.length}+ run types`);
  }

  // Take first 3 strengths
  return strengths.slice(0, 3);
}

/**
 * Identify trade-offs (what runner gives up)
 */
function identifyTradeoffs(
  shoe: Shoe,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  isTradeOffOption: boolean
): string | undefined {
  if (!isTradeOffOption) return undefined;

  const tradeoffs: string[] = [];

  // Weight comparison
  const currentWeights = currentShoes
    .map(cs => catalogue.find(s => s.shoe_id === cs.shoeId)?.weight_g)
    .filter((w): w is number => w !== undefined);

  if (currentWeights.length > 0) {
    const avgCurrentWeight = currentWeights.reduce((a, b) => a + b, 0) / currentWeights.length;
    if (shoe.weight_g > avgCurrentWeight + 40) {
      tradeoffs.push(`Heavier than your current shoes (${shoe.weight_g}g)`);
    }
  }

  // Cushioning trade-off
  if (shoe.cushion_softness_1to5 <= 2) {
    tradeoffs.push(`Firmer ride may take adjustment`);
  }

  // Price
  if (shoe.retail_price_category === "Premium" || shoe.retail_price_category === "Race_Day") {
    tradeoffs.push(`Premium price point`);
  }

  // Stability vs neutral
  if (shoe.support_type === "max_stability") {
    tradeoffs.push(`More structured feel than neutral shoes`);
  }

  return tradeoffs.length > 0 ? tradeoffs.join('; ') : undefined;
}

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Generate exactly 3 shoe recommendations that address the identified gap
 *
 * @param gap - The primary gap identified
 * @param profile - Runner profile
 * @param currentShoes - Current shoe rotation
 * @param catalogue - Full shoe catalogue
 * @returns Array of exactly 3 recommended shoes
 * @throws Error if unable to find 3 valid recommendations
 */
export function generateRecommendations(
  gap: Gap,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): RecommendedShoe[] {
  // Step 1: Build constraints from gap
  let constraints = buildConstraintsFromGap(gap, profile, currentShoes);

  // Step 2: Get candidates
  let candidates = getCandidates(constraints, catalogue);

  // Step 3: If fewer than 3 candidates, relax constraints
  if (candidates.length < 3) {
    // Remove brand filter if present
    if (constraints.brandOnly) {
      delete constraints.brandOnly;
      candidates = getCandidates(constraints, catalogue);
    }
  }

  if (candidates.length < 3) {
    // Expand roles
    if (constraints.roles && constraints.roles.length === 1) {
      const role = constraints.roles[0];
      const expandedRoles = [role];

      // Add related roles
      if (role === "tempo") expandedRoles.push("daily", "intervals");
      if (role === "easy") expandedRoles.push("daily", "long");
      if (role === "long") expandedRoles.push("easy", "daily");
      if (role === "intervals") expandedRoles.push("tempo");

      constraints.roles = expandedRoles as ShoeRole[];
      candidates = getCandidates(constraints, catalogue);
    }
  }

  // Final validation
  if (candidates.length < 3) {
    throw new Error(`Unable to find 3 suitable recommendations. Only found ${candidates.length} candidates.`);
  }

  // Step 4: Score candidates for gap fit
  const scoredCandidates: ScoredShoe[] = candidates.map(shoe => ({
    shoe,
    totalScore: 50 + scoreForGapFit(shoe, gap, profile), // Base score + gap bonus
  }));

  // Step 5: Select 3 diverse shoes
  const selectedThree = selectDiverseThree(scoredCandidates);

  if (!selectedThree) {
    throw new Error('Unable to select 3 diverse recommendations');
  }

  const [closeMatch1, closeMatch2, tradeOff] = selectedThree;

  // Step 6: Build RecommendedShoe objects
  const recommendations: RecommendedShoe[] = [
    buildRecommendedShoe(closeMatch1, gap, "close_match", currentShoes, catalogue, false),
    buildRecommendedShoe(closeMatch2, gap, "close_match_2", currentShoes, catalogue, false),
    buildRecommendedShoe(tradeOff, gap, "trade_off_option", currentShoes, catalogue, true),
  ];

  // Final validation: ensure all shoes exist in catalogue
  for (const rec of recommendations) {
    const exists = catalogue.some(s => s.shoe_id === rec.shoeId);
    if (!exists) {
      throw new Error(`Recommendation validation failed: ${rec.shoeId} not found in catalogue`);
    }
  }

  return recommendations;
}

/**
 * Build a RecommendedShoe object from a Shoe
 */
function buildRecommendedShoe(
  shoe: Shoe,
  gap: Gap,
  type: RecommendationType,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  isTradeOff: boolean
): RecommendedShoe {
  return {
    shoeId: shoe.shoe_id,
    fullName: shoe.full_name,
    brand: shoe.brand,
    model: shoe.model,
    version: shoe.version,
    weight_g: shoe.weight_g,
    heel_drop_mm: shoe.heel_drop_mm,
    has_plate: shoe.has_plate,
    retail_price_category: shoe.retail_price_category,
    release_status: shoe.release_status,
    cushion_softness_1to5: shoe.cushion_softness_1to5,
    bounce_1to5: shoe.bounce_1to5,
    stability_1to5: shoe.stability_1to5,
    recommendationType: type,
    matchReason: generateMatchReason(shoe, gap),
    keyStrengths: extractKeyStrengths(shoe, gap),
    tradeOffs: identifyTradeoffs(shoe, currentShoes, catalogue, isTradeOff),
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Validate that recommendations are diverse enough
 */
export function areRecommendationsDiverse(recommendations: RecommendedShoe[]): boolean {
  if (recommendations.length !== 3) return false;

  const brands = new Set(recommendations.map(r => r.brand));

  // Should have at least 2 different brands OR
  // significant difference in feel
  if (brands.size >= 2) return true;

  // Check feel diversity
  const cushionValues = recommendations.map(r => r.cushion_softness_1to5);
  const maxCushionDiff = Math.max(...cushionValues) - Math.min(...cushionValues);

  return maxCushionDiff >= 2;
}
