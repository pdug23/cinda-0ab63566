// ============================================================================
// RECOMMENDATION ENGINE
// Generates exactly 3 shoe recommendations that address the identified gap
// ============================================================================

import OpenAI from 'openai';
import type {
  Gap,
  RecommendedShoe,
  RecommendationType,
  Shoe,
  RunnerProfile,
  CurrentShoe,
  ShoeRole,
  FeelPreferences,
  ShoeRequest,
} from '../types.js';
import { getCandidates } from './shoeRetrieval.js';

// ============================================================================
// LLM-BASED MATCH DESCRIPTION GENERATOR
// ============================================================================

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a custom match description using gpt-5-mini
 * Returns two bullet points: why it's good for role, what's notable
 */
async function generateMatchDescription(
  role: string,
  whyItFeelsThisWay: string | undefined,
  notableDetail: string | undefined
): Promise<string[]> {
  // Fallback if no shoe characteristics provided
  if (!whyItFeelsThisWay && !notableDetail) {
    return [
      `Well-suited for ${role} runs based on your preferences.`,
      `A solid option for this role.`
    ];
  }

  const prompt = `You're recommending a ${role} shoe to a runner.

Write exactly TWO bullet points:
1. Why this shoe is good for ${role} runs (connect the feel to the role)
2. What's notable or unique about this shoe compared to other shoes

Shoe characteristics: ${whyItFeelsThisWay || 'Not specified'}
What makes it special: ${notableDetail || 'Not specified'}

Be conversational and confident. Return only the two bullet points, no numbering or formatting.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (content) {
      // Split by newlines and filter out empty lines
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Return first two non-empty lines
      if (lines.length >= 2) {
        return [lines[0], lines[1]];
      } else if (lines.length === 1) {
        // If only one line, use it and add a fallback
        return [lines[0], notableDetail || `A solid option for ${role} runs.`];
      }
    }
  } catch (error) {
    console.error('[generateMatchDescription] OpenAI API error:', error);
  }

  // Fallback to two bullet points
  return [
    notableDetail || `Well-suited for ${role} runs based on your preferences.`,
    `A solid option for this role.`
  ];
}

// ============================================================================
// CONSTRAINT BUILDING
// ============================================================================

/**
 * Build retrieval constraints from the identified gap
 */
function buildConstraintsFromGap(
  gap: Gap,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  feelPreferences: FeelPreferences
): {
  roles?: ShoeRole[];
  stabilityNeed?: "neutral" | "stability" | "stable_feel";
  feelPreferences?: FeelPreferences;
  excludeShoeIds?: string[];
  brandOnly?: string;
} {
  const constraints: ReturnType<typeof buildConstraintsFromGap> = {
    feelPreferences: feelPreferences,
    excludeShoeIds: currentShoes.map(s => s.shoeId),
  };

  // Determine stability need from feel preferences
  const stableArr = Array.isArray(feelPreferences.stabilityAmount) ? feelPreferences.stabilityAmount : [feelPreferences.stabilityAmount];
  if (stableArr.includes(4) || stableArr.includes(5)) {
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
          energyReturn: 4, // More bouncy for performance
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
          cushionAmount: 5, // Max cushion
          stabilityAmount: 4, // Stable
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
 * Extract differentiated key strengths for a shoe compared to other recommendations
 * Highlights what makes THIS specific shoe unique
 */
function extractDifferentiatedStrengths(
  shoe: Shoe,
  gap: Gap,
  allThreeShoes: Shoe[]
): string[] {
  const strengths: string[] = [];
  const otherShoes = allThreeShoes.filter(s => s.shoe_id !== shoe.shoe_id);

  // 1. WEIGHT COMPARISON - Find if this is the lightest/heaviest
  const weights = allThreeShoes.map(s => s.weight_g);
  const isLightest = shoe.weight_g === Math.min(...weights);
  const isHeaviest = shoe.weight_g === Math.max(...weights);

  if (isLightest && shoe.weight_g < 240) {
    strengths.push(`Lightest option at ${shoe.weight_g}g for nimble feel`);
  } else if (isHeaviest && weights.some(w => shoe.weight_g - w >= 30)) {
    // Only mention if significantly heavier (30g+)
    strengths.push(`Most protective build at ${shoe.weight_g}g`);
  }

  // 2. CUSHIONING COMPARISON - Softest/firmest
  const cushionValues = allThreeShoes.map(s => s.cushion_softness_1to5);
  const isSoftest = shoe.cushion_softness_1to5 === Math.max(...cushionValues);
  const isFirmest = shoe.cushion_softness_1to5 === Math.min(...cushionValues);

  if (isSoftest && shoe.cushion_softness_1to5 >= 4) {
    strengths.push(`Softest ride with ${shoe.cushion_softness_1to5 === 5 ? 'max' : 'plush'} cushioning`);
  } else if (isFirmest && shoe.cushion_softness_1to5 <= 2) {
    strengths.push(`Firmest platform for responsive efficiency`);
  }

  // 3. BOUNCE/ENERGY RETURN COMPARISON
  const bounceValues = allThreeShoes.map(s => s.bounce_1to5);
  const isBounciest = shoe.bounce_1to5 === Math.max(...bounceValues);

  if (isBounciest && shoe.bounce_1to5 >= 4 && strengths.length < 3) {
    strengths.push(`Most energetic foam returns power with each step`);
  }

  // 4. PLATE TECHNOLOGY - Unique selling point
  if (shoe.has_plate && shoe.plate_tech_name && strengths.length < 3) {
    const othersHavePlate = otherShoes.some(s => s.has_plate);
    if (!othersHavePlate) {
      strengths.push(`Only plated option with ${shoe.plate_tech_name}`);
    } else if (shoe.plate_tech_name) {
      strengths.push(`${shoe.plate_tech_name} for snappy propulsion`);
    }
  }

  // 5. STABILITY COMPARISON
  const stabilityValues = allThreeShoes.map(s => s.stability_1to5);
  const isMostStable = shoe.stability_1to5 === Math.max(...stabilityValues);

  if (isMostStable && shoe.stability_1to5 >= 4 && strengths.length < 3) {
    strengths.push(`Most stable platform controls excessive motion`);
  }

  // 6. ROCKER GEOMETRY
  const rockerValues = allThreeShoes.map(s => s.rocker_1to5);
  const hasMostRocker = shoe.rocker_1to5 === Math.max(...rockerValues);

  if (hasMostRocker && shoe.rocker_1to5 >= 4 && strengths.length < 3) {
    strengths.push(`Aggressive rocker for smooth, efficient transitions`);
  }

  // 7. VERSATILITY - Only if truly versatile
  const useCases = [
    shoe.use_daily && 'daily',
    shoe.use_easy_recovery && 'easy',
    shoe.use_long_run && 'long',
    shoe.use_tempo_workout && 'tempo',
  ].filter(Boolean);

  if (useCases.length >= 3 && strengths.length < 3) {
    const otherVersatility = otherShoes.map(s =>
      [s.use_daily, s.use_easy_recovery, s.use_long_run, s.use_tempo_workout].filter(Boolean).length
    );
    const isMostVersatile = useCases.length > Math.max(...otherVersatility);

    if (isMostVersatile) {
      strengths.push(`Most versatile across ${useCases.length} run types`);
    }
  }

  // 8. NOTABLE DETAILS - Use shoe-specific features if we need more
  if (strengths.length < 2 && shoe.notable_detail) {
    strengths.push(shoe.notable_detail);
  }

  // 9. WHY IT FEELS THIS WAY - Technical explanation
  if (strengths.length < 2 && shoe.why_it_feels_this_way) {
    strengths.push(shoe.why_it_feels_this_way);
  }

  // 10. FALLBACK - Generic but specific attributes
  if (strengths.length === 0) {
    // At least mention something specific about the shoe
    if (shoe.cushion_softness_1to5 >= 4) {
      strengths.push(`Soft, protective cushion for comfort`);
    } else if (shoe.bounce_1to5 >= 4) {
      strengths.push(`Bouncy, responsive foam`);
    } else {
      strengths.push(`Balanced ride for ${gap.missingCapability || 'your needs'}`);
    }
  }

  // Return top 3 strengths
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
): string[] | undefined {
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

  return tradeoffs.length > 0 ? tradeoffs : undefined;
}

/**
 * Identify trade-offs by comparing against other recommendations
 * Shows what this shoe gives up compared to the alternatives
 */
function identifyTradeoffsComparative(
  shoe: Shoe,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  isTradeOffOption: boolean,
  allThreeShoes: Shoe[]
): string[] | undefined {
  if (!isTradeOffOption) return undefined;

  const tradeoffs: string[] = [];
  const otherShoes = allThreeShoes.filter(s => s.shoe_id !== shoe.shoe_id);

  // 1. WEIGHT COMPARISON - Heavier than alternatives
  const weights = allThreeShoes.map(s => s.weight_g);
  const isHeaviest = shoe.weight_g === Math.max(...weights);
  const weightDiff = shoe.weight_g - Math.min(...weights);

  if (isHeaviest && weightDiff >= 30) {
    tradeoffs.push(`Heavier than alternatives (${shoe.weight_g}g vs ${Math.min(...weights)}g)`);
  }

  // 2. CUSHIONING COMPARISON - Firmer than alternatives
  const cushionValues = allThreeShoes.map(s => s.cushion_softness_1to5);
  const isFirmest = shoe.cushion_softness_1to5 === Math.min(...cushionValues);
  const cushionDiff = Math.max(...cushionValues) - shoe.cushion_softness_1to5;

  if (isFirmest && cushionDiff >= 2) {
    tradeoffs.push(`Firmer ride than softer alternatives`);
  }

  // 3. STABILITY - Less stable if others are more stable
  const stabilityValues = allThreeShoes.map(s => s.stability_1to5);
  const isLeastStable = shoe.stability_1to5 === Math.min(...stabilityValues);
  const stabilityDiff = Math.max(...stabilityValues) - shoe.stability_1to5;

  if (isLeastStable && stabilityDiff >= 2) {
    tradeoffs.push(`Less stability than structured alternatives`);
  }

  // 4. BOUNCE - Less energetic if others are bouncier
  const bounceValues = allThreeShoes.map(s => s.bounce_1to5);
  const isLeastBouncy = shoe.bounce_1to5 === Math.min(...bounceValues);
  const bounceDiff = Math.max(...bounceValues) - shoe.bounce_1to5;

  if (isLeastBouncy && bounceDiff >= 2) {
    tradeoffs.push(`Less energetic than bouncier options`);
  }

  // 5. PRICE - More expensive than alternatives
  if (shoe.retail_price_category === "Premium" || shoe.retail_price_category === "Race_Day") {
    const otherPrices = otherShoes.map(s => s.retail_price_category);
    const hasAffordableAlternative = otherPrices.some(p => p === "Budget" || p === "Core");

    if (hasAffordableAlternative) {
      tradeoffs.push(`Premium price vs more affordable alternatives`);
    }
  }

  // 6. NARROWER FIT - If this has narrow fit and others don't
  if (shoe.notable_detail?.toLowerCase().includes('narrow') && tradeoffs.length < 2) {
    tradeoffs.push(`Narrower fit than alternatives`);
  }

  // 7. FALLBACK - Generic tradeoffs if we don't have specific ones
  if (tradeoffs.length === 0) {
    // Use original generic tradeoffs as fallback
    if (shoe.cushion_softness_1to5 <= 2) {
      tradeoffs.push(`Firmer ride may take adjustment`);
    } else if (shoe.retail_price_category === "Premium" || shoe.retail_price_category === "Race_Day") {
      tradeoffs.push(`Premium price point`);
    }
  }

  return tradeoffs.length > 0 ? tradeoffs.slice(0, 2) : undefined;
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
 * @param feelPreferences - Feel preferences for the recommendations
 * @returns Array of exactly 3 recommended shoes
 * @throws Error if unable to find 3 valid recommendations
 */
export async function generateRecommendations(
  gap: Gap,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  feelPreferences: FeelPreferences
): Promise<RecommendedShoe[]> {
  // Step 1: Build constraints from gap
  let constraints = buildConstraintsFromGap(gap, profile, currentShoes, feelPreferences);

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
  const allThreeShoes = [closeMatch1, closeMatch2, tradeOff];

  // Step 6: Build RecommendedShoe objects with differentiated strengths (async)
  const recommendations: RecommendedShoe[] = await Promise.all([
    buildRecommendedShoe(closeMatch1, gap, "close_match", currentShoes, catalogue, false, allThreeShoes),
    buildRecommendedShoe(closeMatch2, gap, "close_match_2", currentShoes, catalogue, false, allThreeShoes),
    buildRecommendedShoe(tradeOff, gap, "trade_off_option", currentShoes, catalogue, true, allThreeShoes),
  ]);

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
async function buildRecommendedShoe(
  shoe: Shoe,
  gap: Gap,
  type: RecommendationType,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  isTradeOff: boolean,
  allThreeShoes: Shoe[]
): Promise<RecommendedShoe> {
  // Get role from gap for LLM description
  const role = gap.missingCapability || gap.type || 'daily';

  // Generate match description using LLM (with fallback)
  const matchReason = await generateMatchDescription(
    role,
    shoe.why_it_feels_this_way,
    shoe.notable_detail
  );

  return {
    shoeId: shoe.shoe_id,
    fullName: shoe.full_name,
    brand: shoe.brand,
    model: shoe.model,
    version: shoe.version,
    weight_g: shoe.weight_g,
    weight_feel_1to5: shoe.weight_feel_1to5,
    heel_drop_mm: shoe.heel_drop_mm,
    has_plate: shoe.has_plate,
    plate_material: shoe.plate_material,
    retail_price_category: shoe.retail_price_category,
    release_status: shoe.release_status,
    cushion_softness_1to5: shoe.cushion_softness_1to5,
    bounce_1to5: shoe.bounce_1to5,
    stability_1to5: shoe.stability_1to5,
    recommendationType: type,
    matchReason,
    keyStrengths: extractDifferentiatedStrengths(shoe, gap, allThreeShoes),
    tradeOffs: identifyTradeoffsComparative(shoe, currentShoes, catalogue, isTradeOff, allThreeShoes),
  };
}

// ============================================================================
// SHOPPING MODE RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Generate recommendations for a specific shoe request (shopping mode)
 * Similar to generateRecommendations but role-specific and using request's feel preferences
 *
 * @param request - Shoe request with role and feel preferences
 * @param profile - Runner profile (basic info)
 * @param currentShoes - Current shoe rotation (to exclude)
 * @param catalogue - Full shoe catalogue
 * @returns Array of 2-3 recommended shoes for the requested role
 */
export async function generateShoppingRecommendations(
  request: ShoeRequest,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Promise<RecommendedShoe[]> {
  // Step 1: Build constraints for this specific role and feel preferences
  const constraints = {
    roles: [request.role],
    feelPreferences: request.feelPreferences,
    excludeShoeIds: currentShoes.map(s => s.shoeId),
    // Determine stability need from request preferences
    stabilityNeed: (() => {
      const stableArr = Array.isArray(request.feelPreferences.stabilityAmount) ? request.feelPreferences.stabilityAmount : [request.feelPreferences.stabilityAmount];
      return (stableArr.includes(4) || stableArr.includes(5)) ? ("stable_feel" as const) : undefined;
    })(),
  };

  // Step 2: Get candidates for this role
  let candidates = getCandidates(constraints, catalogue);

  // Step 3: If fewer than 3 candidates, relax constraints
  if (candidates.length < 3) {
    // Expand to related roles
    const relatedRoles = getRelatedRolesForShopping(request.role);
    const relaxedConstraints = {
      ...constraints,
      roles: [request.role, ...relatedRoles],
    };
    candidates = getCandidates(relaxedConstraints, catalogue);
  }

  // If still not enough, just take what we have
  if (candidates.length === 0) {
    throw new Error(`Unable to find any shoes for ${request.role} role with the specified preferences.`);
  }

  // Step 4: Score candidates based on how well they match the request
  const scoredCandidates = candidates.map(shoe => ({
    shoe,
    totalScore: scoreShoeForRole(shoe, request.role, request.feelPreferences),
  }));

  // Step 5: Select top 2-3 shoes with diversity
  const selectedShoes = selectShoppingShoes(scoredCandidates);

  // Step 6: Build RecommendedShoe objects (async with LLM match descriptions)
  const recommendationPromises = selectedShoes.map((shoe, index) => {
    const recType: RecommendationType = index === 0
      ? "close_match"
      : index === 1
        ? "close_match_2"
        : "trade_off_option";

    return buildShoppingRecommendedShoe(
      shoe,
      request.role,
      recType,
      currentShoes,
      catalogue,
      index === selectedShoes.length - 1 // isTradeOff for last shoe
    );
  });

  const recommendations: RecommendedShoe[] = await Promise.all(recommendationPromises);

  return recommendations;
}

/**
 * Get related roles for shopping mode fallback
 */
function getRelatedRolesForShopping(role: ShoeRole): ShoeRole[] {
  const relatedMap: Record<ShoeRole, ShoeRole[]> = {
    'daily': ['easy', 'long'],
    'easy': ['daily', 'long'],
    'long': ['daily', 'easy'],
    'tempo': ['daily', 'intervals'],
    'intervals': ['tempo', 'race'],
    'race': ['intervals'],
    'trail': [],
  };
  return relatedMap[role] || [];
}

/**
 * Score a shoe for how well it matches a specific role and feel preferences
 */
function scoreShoeForRole(
  shoe: Shoe,
  role: ShoeRole,
  feelPreferences: FeelPreferences
): number {
  let score = 0;

  // Role match (0-40 points)
  const roleField = getRoleFieldFromCapability(role);
  if (roleField && shoe[roleField] === true) {
    score += 40;
  }

  // Feel match (0-30 points) - using same logic as shoeRetrieval
  // Normalize preferences to arrays
  const normalizePref = (pref: number | number[]): number[] => Array.isArray(pref) ? pref : [pref];
  const cushionArr = normalizePref(feelPreferences.cushionAmount);
  const stabilityArr = normalizePref(feelPreferences.stabilityAmount);
  const bounceArr = normalizePref(feelPreferences.energyReturn);

  const minDistance = (shoeValue: number, prefArr: number[]): number => {
    return Math.min(...prefArr.map(p => Math.abs(shoeValue - p)));
  };

  const cushionScore = Math.max(0, 10 - minDistance(shoe.cushion_softness_1to5, cushionArr) * 2);
  const stabilityScore = Math.max(0, 10 - minDistance(shoe.stability_1to5, stabilityArr) * 2);
  const bounceScore = Math.max(0, 10 - minDistance(shoe.bounce_1to5, bounceArr) * 2);
  score += cushionScore + stabilityScore + bounceScore;

  // Availability bonus (0-15 points)
  if (shoe.release_status === "available") {
    score += 15;
  } else if (shoe.release_status === "coming_soon") {
    score += 10;
  }

  return score;
}

/**
 * Select 2-3 shoes from scored candidates for shopping mode
 */
function selectShoppingShoes(scoredCandidates: ScoredShoe[]): Shoe[] {
  if (scoredCandidates.length === 0) return [];
  if (scoredCandidates.length === 1) return [scoredCandidates[0].shoe];
  if (scoredCandidates.length === 2) return [scoredCandidates[0].shoe, scoredCandidates[1].shoe];

  // Sort by score descending
  const sorted = [...scoredCandidates].sort((a, b) => b.totalScore - a.totalScore);

  // Take top 3, prioritizing diversity
  const selected: Shoe[] = [sorted[0].shoe];

  // Find second shoe (prefer similar to first)
  for (let i = 1; i < sorted.length; i++) {
    if (selected.length < 2) {
      selected.push(sorted[i].shoe);
      break;
    }
  }

  // Find third shoe (prefer different from first two)
  for (const candidate of sorted) {
    if (selected.length >= 3) break;
    if (selected.some(s => s.shoe_id === candidate.shoe.shoe_id)) continue;

    // Prefer a different option
    if (areDifferent(candidate.shoe, selected[0])) {
      selected.push(candidate.shoe);
      break;
    }
  }

  // If we still don't have 3, just take the next best
  if (selected.length < 3) {
    for (const candidate of sorted) {
      if (selected.length >= 3) break;
      if (!selected.some(s => s.shoe_id === candidate.shoe.shoe_id)) {
        selected.push(candidate.shoe);
      }
    }
  }

  return selected;
}

/**
 * Build a RecommendedShoe object for shopping mode
 */
async function buildShoppingRecommendedShoe(
  shoe: Shoe,
  role: ShoeRole,
  type: RecommendationType,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  isTradeOff: boolean
): Promise<RecommendedShoe> {
  // Generate match description using LLM (with fallback)
  const matchReason = await generateMatchDescription(
    role,
    shoe.why_it_feels_this_way,
    shoe.notable_detail
  );

  return {
    shoeId: shoe.shoe_id,
    fullName: shoe.full_name,
    brand: shoe.brand,
    model: shoe.model,
    version: shoe.version,
    weight_g: shoe.weight_g,
    weight_feel_1to5: shoe.weight_feel_1to5,
    heel_drop_mm: shoe.heel_drop_mm,
    has_plate: shoe.has_plate,
    plate_material: shoe.plate_material,
    retail_price_category: shoe.retail_price_category,
    release_status: shoe.release_status,
    cushion_softness_1to5: shoe.cushion_softness_1to5,
    bounce_1to5: shoe.bounce_1to5,
    stability_1to5: shoe.stability_1to5,
    recommendationType: type,
    matchReason,
    keyStrengths: extractKeyStrengthsForRole(shoe, role),
    tradeOffs: identifyTradeoffs(shoe, currentShoes, catalogue, isTradeOff),
  };
}

/**
 * Generate match reason for shopping mode
 */
function generateShoppingMatchReason(shoe: Shoe, role: ShoeRole): string {
  const roleDescriptions: Record<ShoeRole, string> = {
    'daily': 'Versatile daily trainer for most of your weekly mileage',
    'easy': 'Cushioned recovery shoe for easy days and building mileage safely',
    'long': 'Protective long-run shoe with comfort for sustained miles',
    'tempo': `${shoe.has_plate ? 'Plated' : 'Responsive'} trainer for tempo efforts`,
    'intervals': 'Lightweight speed shoe for track workouts and fast efforts',
    'race': 'Race shoe for maximum efficiency on race day',
    'trail': 'Trail shoe for off-road adventures',
  };
  return roleDescriptions[role] || 'Well-rounded option for your needs';
}

/**
 * Extract key strengths for a specific role (shopping mode)
 */
function extractKeyStrengthsForRole(shoe: Shoe, role: ShoeRole): string[] {
  const strengths: string[] = [];

  // Role-specific strengths
  if (role === 'tempo' || role === 'intervals' || role === 'race') {
    // Performance-focused roles
    if (shoe.has_plate && shoe.plate_tech_name) {
      strengths.push(`${shoe.plate_tech_name} adds snap and propulsion`);
    } else if (shoe.has_plate) {
      strengths.push(`${shoe.plate_material || 'Plate'} adds snap for faster paces`);
    }
    if (shoe.weight_g < 240) {
      strengths.push(`Lightweight (${shoe.weight_g}g) for nimble feel`);
    }
    if (shoe.bounce_1to5 >= 4) {
      strengths.push(`Energetic, bouncy foam returns energy`);
    }
  } else {
    // Recovery/daily roles
    if (shoe.cushion_softness_1to5 >= 4) {
      strengths.push(`Soft, protective ${shoe.cushion_softness_1to5 === 5 ? 'max-' : ''}cushion ride`);
    }
    if (shoe.stability_1to5 >= 4) {
      strengths.push(`Stable platform prevents excessive motion`);
    }
    // Versatility
    const useCases = [
      shoe.use_daily && 'daily',
      shoe.use_easy_recovery && 'easy',
      shoe.use_long_run && 'long',
    ].filter(Boolean);
    if (useCases.length >= 2) {
      strengths.push(`Versatile across ${useCases.length}+ run types`);
    }
  }

  // Always mention notable details if strengths list is short
  if (strengths.length < 2 && shoe.notable_detail) {
    strengths.push(shoe.notable_detail);
  }

  // Take first 3 strengths
  return strengths.slice(0, 3);
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
