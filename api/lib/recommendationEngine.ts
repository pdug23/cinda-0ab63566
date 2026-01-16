// ============================================================================
// RECOMMENDATION ENGINE
// Generates exactly 3 shoe recommendations that address the identified gap
// Updated for archetype-based model
// ============================================================================

import OpenAI from 'openai';
import type {
  Gap,
  RecommendedShoe,
  RecommendationBadge,
  RecommendationPosition,
  Shoe,
  RunnerProfile,
  CurrentShoe,
  ShoeArchetype,
  FeelPreferences,
  ShoeRequest,
  ChatContext,
} from '../types.js';
import {
  shoeHasArchetype,
  getShoeArchetypes
} from '../types.js';
import {
  getCandidates,
  scoreShoe,
  getHeelDropRangeDistance,
  type RetrievalConstraints,
  type ScoredShoe
} from './shoeRetrieval.js';

// ============================================================================
// LLM-BASED MATCH DESCRIPTION GENERATOR
// ============================================================================

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Parameters for generating match description bullets
 */
interface MatchDescriptionParams {
  fullName: string;
  archetype: string;
  whyItFeelsThisWay: string;
  notableDetail: string;
  avoidIf: string;
  plateTechName: string | null;
  plateMaterial: string | null;
  wetGrip: string;
  weight_g: number;
  heelDrop_mm: number;
  cushion_1to5: number;
  bounce_1to5: number;
  stability_1to5: number;
  rocker_1to5: number;
}

/**
 * Generate a custom match description using gpt-5-mini
 * Returns three bullet points: midsole/ride, differentiator, versatility
 */
async function generateMatchDescription(params: MatchDescriptionParams): Promise<string[]> {
  console.log('[generateMatchDescription] Called with params:', JSON.stringify(params, null, 2));

  const archetypeLabel = params.archetype.replace('_', ' ');

  // Build descriptive context from specs
  const cushionDesc = params.cushion_1to5 <= 2 ? 'firm' : params.cushion_1to5 >= 4 ? 'soft' : 'moderate';
  const bounceDesc = params.bounce_1to5 <= 2 ? 'muted' : params.bounce_1to5 >= 4 ? 'bouncy/responsive' : 'balanced';
  const weightDesc = params.weight_g < 230 ? 'lightweight' : params.weight_g > 280 ? 'heavier' : 'moderate weight';
  const plateInfo = params.plateTechName
    ? `Has ${params.plateTechName} (${params.plateMaterial})`
    : 'No plate';

  const prompt = `You're writing shoe card bullets for runners choosing shoes.

SHOE: ${params.fullName}
USE CASE: ${archetypeLabel}

TECH & FEEL:
${params.whyItFeelsThisWay}

NOTABLE:
${params.notableDetail}

SPECS (for context, DO NOT output these as numbers):
- Weight: ${params.weight_g}g (${weightDesc})
- Drop: ${params.heelDrop_mm}mm
- Cushion: ${cushionDesc} (${params.cushion_1to5}/5)
- Response: ${bounceDesc} (${params.bounce_1to5}/5)
- ${plateInfo}
- Wet grip: ${params.wetGrip}

AVOID IF:
${params.avoidIf}

Write exactly 3 bullets (max 13 words each):

1. MIDSOLE/RIDE: How the foam or plate tech affects the ride. Name specific tech from the data.
2. DIFFERENTIATOR: What makes this shoe stand out. Be concrete and specific.
3. VERSATILITY: What else it's good for beyond the primary use case, or who it suits best. Reference other archetypes if applicable (e.g., "doubles as a race shoe" or "can handle easy days too").

RULES:
- Use tech names from the data (foam names, plate names, plate material)
- Say what it DOES, not vague feelings
- No marketing fluff or clever hooks
- No em dashes
- NEVER include specific weight (g) or drop (mm) numbers — these are shown elsewhere
- You can say "lightweight" or "low drop" but not "254g" or "6mm"
- Start each bullet with the tech or feature, not "The" or "This"`;

  try {
    const response = await openaiClient.responses.create({
      model: 'gpt-5-mini',
      input: prompt,
      text: {
        verbosity: 'low'
      },
      max_output_tokens: 2500
    });

    console.log('[generateMatchDescription] Raw LLM response:', JSON.stringify(response, null, 2));

    let content: string | undefined;
    content = (response.output?.[0] as any)?.text?.trim();
    if (!content) content = (response.output as any)?.text?.trim();
    if (!content) content = (response.output?.[0] as any)?.content?.trim();
    if (!content) content = (response as any)?.output_text?.trim();

    console.log('[generateMatchDescription] Extracted content:', content);

    if (content) {
      // Clean up numbered prefixes like "1. " or "1) " or "- "
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[\d]+[.\)]\s*/, '').replace(/^[-•]\s*/, '').trim());

      // Ensure consistent punctuation - remove trailing periods
      const normalizedLines = lines.map(line => line.replace(/\.$/, ''));

      console.log('[generateMatchDescription] Parsed lines:', normalizedLines);

      if (normalizedLines.length >= 3) {
        const result = [normalizedLines[0], normalizedLines[1], normalizedLines[2]];
        console.log('[generateMatchDescription] Returning 3 bullets:', result);
        return result;
      } else if (normalizedLines.length === 2) {
        const result = [normalizedLines[0], normalizedLines[1], params.notableDetail.replace(/\.$/, '')];
        console.log('[generateMatchDescription] Only 2 lines, adding fallback. Returning:', result);
        return result;
      } else if (normalizedLines.length === 1) {
        const result = [normalizedLines[0], params.notableDetail.replace(/\.$/, ''), params.whyItFeelsThisWay.slice(0, 80).replace(/\.$/, '')];
        console.log('[generateMatchDescription] Only 1 line, adding fallbacks. Returning:', result);
        return result;
      }
    }
  } catch (error) {
    console.error('[generateMatchDescription] OpenAI API error:', error);
  }

  // Fallback if API fails
  console.log('[generateMatchDescription] Using complete fallback - no valid content from LLM');
  return [
    params.notableDetail.replace(/\.$/, ''),
    params.whyItFeelsThisWay.length > 80
      ? params.whyItFeelsThisWay.slice(0, 77).replace(/\.$/, '') + '...'
      : params.whyItFeelsThisWay.replace(/\.$/, ''),
    `Well-suited for ${archetypeLabel}`
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
): RetrievalConstraints {
  const constraints: RetrievalConstraints = {
    feelPreferences: feelPreferences,
    excludeShoeIds: currentShoes.map(s => s.shoeId),
    profile: profile,
    currentShoes: currentShoes, // For love/dislike tag modifiers
  };

  // Determine stability need from feel preferences (only if user_set mode)
  const stabPref = feelPreferences.stabilityAmount;
  if (stabPref.mode === 'user_set' && stabPref.value !== undefined) {
    if (stabPref.value >= 4) {
      constraints.stabilityNeed = "stable_feel";
    }
  }

  // Set archetypes based on gap
  if (gap.recommendedArchetype) {
    constraints.archetypes = [gap.recommendedArchetype];
    constraints.archetypeContext = gap.recommendedArchetype;
  }

  switch (gap.type) {
    case "coverage":
    case "misuse":
      // Use recommended archetype from gap
      break;

    case "performance":
      // Need workout or race shoes
      constraints.archetypes = ["workout_shoe", "race_shoe"];
      constraints.archetypeContext = "workout_shoe";
      // Prefer responsive feel if user hasn't explicitly set it
      if (constraints.feelPreferences && constraints.feelPreferences.energyReturn.mode === 'cinda_decides') {
        constraints.feelPreferences = {
          ...constraints.feelPreferences,
          energyReturn: { mode: 'user_set', value: 4 },
        };
      }
      break;

    case "recovery":
      // Need recovery or daily shoes
      constraints.archetypes = ["recovery_shoe", "daily_trainer"];
      constraints.archetypeContext = "recovery_shoe";
      // Prefer soft, stable feel if user hasn't explicitly set it
      if (constraints.feelPreferences) {
        const updates: Partial<FeelPreferences> = {};
        if (constraints.feelPreferences.cushionAmount.mode === 'cinda_decides') {
          updates.cushionAmount = { mode: 'user_set', value: 5 };
        }
        if (constraints.feelPreferences.stabilityAmount.mode === 'cinda_decides') {
          updates.stabilityAmount = { mode: 'user_set', value: 4 };
        }
        if (Object.keys(updates).length > 0) {
          constraints.feelPreferences = { ...constraints.feelPreferences, ...updates };
        }
      }
      break;

    case "redundancy":
      // Use recommended archetype from gap
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

  // Archetype match bonus
  if (gap.recommendedArchetype && shoeHasArchetype(shoe, gap.recommendedArchetype)) {
    bonus += 20;
  }

  // Versatility bonus - shoes with multiple archetypes
  const archetypes = getShoeArchetypes(shoe);
  if (archetypes.length >= 2) bonus += 10;

  switch (gap.type) {
    case "coverage":
    case "misuse":
      // Already covered by archetype match
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
      // Different feel from redundant shoes is handled elsewhere
      break;
  }

  return bonus;
}

// ============================================================================
// SHOE SELECTION
// ============================================================================

/**
 * Check if two shoes are similar in feel and performance
 */
function areSimilar(shoe1: Shoe, shoe2: Shoe): boolean {
  const cushionDiff = Math.abs(shoe1.cushion_softness_1to5 - shoe2.cushion_softness_1to5);
  const bounceDiff = Math.abs(shoe1.bounce_1to5 - shoe2.bounce_1to5);
  const stabilityDiff = Math.abs(shoe1.stability_1to5 - shoe2.stability_1to5);
  const weightDiff = Math.abs(shoe1.weight_g - shoe2.weight_g);
  const sameConstruction = shoe1.has_plate === shoe2.has_plate;

  return cushionDiff <= 1 &&
    bounceDiff <= 1 &&
    stabilityDiff <= 1 &&
    weightDiff <= 30 &&
    sameConstruction;
}

/**
 * Check if two shoes offer meaningfully different experiences
 */
function areDifferent(shoe1: Shoe, shoe2: Shoe): boolean {
  let differenceCount = 0;

  if (Math.abs(shoe1.cushion_softness_1to5 - shoe2.cushion_softness_1to5) >= 2) differenceCount++;
  if (Math.abs(shoe1.bounce_1to5 - shoe2.bounce_1to5) >= 2) differenceCount++;
  if (Math.abs(shoe1.stability_1to5 - shoe2.stability_1to5) >= 2) differenceCount++;
  if (Math.abs(shoe1.weight_g - shoe2.weight_g) >= 40) differenceCount++;
  if (shoe1.has_plate !== shoe2.has_plate) differenceCount++;
  if (Math.abs(shoe1.rocker_1to5 - shoe2.rocker_1to5) >= 2) differenceCount++;

  return differenceCount >= 2;
}

/**
 * Select 3 diverse shoes from candidates
 * Returns [closeMatch1, closeMatch2, tradeOff]
 */
function selectDiverseThree(scoredCandidates: ScoredShoe[]): [Shoe, Shoe, Shoe] | null {
  if (scoredCandidates.length < 3) return null;

  const sorted = [...scoredCandidates].sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.shoe.shoe_id.localeCompare(b.shoe.shoe_id)
  );

  const closeMatch1 = sorted[0].shoe;

  let closeMatch2: Shoe | null = null;
  for (let i = 1; i < sorted.length; i++) {
    if (areSimilar(sorted[i].shoe, closeMatch1)) {
      closeMatch2 = sorted[i].shoe;
      break;
    }
  }
  if (!closeMatch2 && sorted.length >= 2) {
    closeMatch2 = sorted[1].shoe;
  }

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
 * Extract differentiated key strengths for a shoe compared to other recommendations
 */
function extractDifferentiatedStrengths(
  shoe: Shoe,
  gap: Gap,
  allThreeShoes: Shoe[]
): string[] {
  const strengths: string[] = [];
  const otherShoes = allThreeShoes.filter(s => s.shoe_id !== shoe.shoe_id);

  // Weight comparison
  const weights = allThreeShoes.map(s => s.weight_g);
  const isLightest = shoe.weight_g === Math.min(...weights);
  const isHeaviest = shoe.weight_g === Math.max(...weights);

  if (isLightest && shoe.weight_g < 240) {
    strengths.push(`Lightest option at ${shoe.weight_g}g for nimble feel`);
  } else if (isHeaviest && weights.some(w => shoe.weight_g - w >= 30)) {
    strengths.push(`Most protective build at ${shoe.weight_g}g`);
  }

  // Cushioning comparison
  const cushionValues = allThreeShoes.map(s => s.cushion_softness_1to5);
  const isSoftest = shoe.cushion_softness_1to5 === Math.max(...cushionValues);
  const isFirmest = shoe.cushion_softness_1to5 === Math.min(...cushionValues);

  if (isSoftest && shoe.cushion_softness_1to5 >= 4) {
    strengths.push(`Softest ride with ${shoe.cushion_softness_1to5 === 5 ? 'max' : 'plush'} cushioning`);
  } else if (isFirmest && shoe.cushion_softness_1to5 <= 2) {
    strengths.push(`Firmest platform for responsive efficiency`);
  }

  // Bounce comparison
  const bounceValues = allThreeShoes.map(s => s.bounce_1to5);
  const isBounciest = shoe.bounce_1to5 === Math.max(...bounceValues);

  if (isBounciest && shoe.bounce_1to5 >= 4 && strengths.length < 3) {
    strengths.push(`Most energetic foam returns power with each step`);
  }

  // Plate technology
  if (shoe.has_plate && shoe.plate_tech_name && strengths.length < 3) {
    const othersHavePlate = otherShoes.some(s => s.has_plate);
    if (!othersHavePlate) {
      strengths.push(`Only plated option with ${shoe.plate_tech_name}`);
    } else if (shoe.plate_tech_name) {
      strengths.push(`${shoe.plate_tech_name} for snappy propulsion`);
    }
  }

  // Stability comparison
  const stabilityValues = allThreeShoes.map(s => s.stability_1to5);
  const isMostStable = shoe.stability_1to5 === Math.max(...stabilityValues);

  if (isMostStable && shoe.stability_1to5 >= 4 && strengths.length < 3) {
    strengths.push(`Most stable platform controls excessive motion`);
  }

  // Rocker geometry
  const rockerValues = allThreeShoes.map(s => s.rocker_1to5);
  const hasMostRocker = shoe.rocker_1to5 === Math.max(...rockerValues);

  if (hasMostRocker && shoe.rocker_1to5 >= 4 && strengths.length < 3) {
    strengths.push(`Aggressive rocker for smooth, efficient transitions`);
  }

  // Versatility - check multiple archetypes
  const archetypes = getShoeArchetypes(shoe);
  if (archetypes.length >= 2 && strengths.length < 3) {
    const otherVersatility = otherShoes.map(s => getShoeArchetypes(s).length);
    const isMostVersatile = archetypes.length > Math.max(...otherVersatility, 0);
    if (isMostVersatile) {
      strengths.push(`Most versatile across ${archetypes.length} shoe types`);
    }
  }

  // Notable details fallback
  if (strengths.length < 2 && shoe.notable_detail) {
    strengths.push(shoe.notable_detail);
  }

  if (strengths.length < 2 && shoe.why_it_feels_this_way) {
    strengths.push(shoe.why_it_feels_this_way);
  }

  // Final fallback
  if (strengths.length === 0) {
    if (shoe.cushion_softness_1to5 >= 4) {
      strengths.push(`Soft, protective cushion for comfort`);
    } else if (shoe.bounce_1to5 >= 4) {
      strengths.push(`Bouncy, responsive foam`);
    } else {
      const archetypeLabel = gap.recommendedArchetype?.replace('_', ' ') || 'your needs';
      strengths.push(`Balanced ride for ${archetypeLabel}`);
    }
  }

  return strengths.slice(0, 3);
}

/**
 * Identify trade-offs by comparing against other recommendations
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

  // Weight comparison
  const weights = allThreeShoes.map(s => s.weight_g);
  const isHeaviest = shoe.weight_g === Math.max(...weights);
  const weightDiff = shoe.weight_g - Math.min(...weights);

  if (isHeaviest && weightDiff >= 30) {
    tradeoffs.push(`Heavier than alternatives (${shoe.weight_g}g vs ${Math.min(...weights)}g)`);
  }

  // Cushioning comparison
  const cushionValues = allThreeShoes.map(s => s.cushion_softness_1to5);
  const isFirmest = shoe.cushion_softness_1to5 === Math.min(...cushionValues);
  const cushionDiff = Math.max(...cushionValues) - shoe.cushion_softness_1to5;

  if (isFirmest && cushionDiff >= 2) {
    tradeoffs.push(`Firmer ride than softer alternatives`);
  }

  // Stability comparison
  const stabilityValues = allThreeShoes.map(s => s.stability_1to5);
  const isLeastStable = shoe.stability_1to5 === Math.min(...stabilityValues);
  const stabilityDiff = Math.max(...stabilityValues) - shoe.stability_1to5;

  if (isLeastStable && stabilityDiff >= 2) {
    tradeoffs.push(`Less stability than structured alternatives`);
  }

  // Price comparison
  if (shoe.retail_price_category === "Premium" || shoe.retail_price_category === "Race_Day") {
    const otherPrices = otherShoes.map(s => s.retail_price_category);
    const hasAffordableAlternative = otherPrices.some(p => p === "Budget" || p === "Core");

    if (hasAffordableAlternative) {
      tradeoffs.push(`Premium price vs more affordable alternatives`);
    }
  }

  // Fallback
  if (tradeoffs.length === 0) {
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
 */
export async function generateRecommendations(
  gap: Gap,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  feelPreferences: FeelPreferences,
  chatContext?: ChatContext
): Promise<RecommendedShoe[]> {
  // Step 1: Build constraints from gap
  let constraints = buildConstraintsFromGap(gap, profile, currentShoes, feelPreferences);

  // Add chat context to constraints for scoring
  if (chatContext) {
    constraints.chatContext = chatContext;
  }

  // Step 2: Get candidates
  let candidates = getCandidates(constraints, catalogue);

  // Step 3: If fewer than 3 candidates, relax constraints
  if (candidates.length < 3 && constraints.archetypes && constraints.archetypes.length === 1) {
    // Expand to related archetypes
    const archetype = constraints.archetypes[0];
    const relatedArchetypes = getRelatedArchetypes(archetype);
    constraints.archetypes = [archetype, ...relatedArchetypes];
    candidates = getCandidates(constraints, catalogue);
  }

  if (candidates.length < 3) {
    throw new Error(`Unable to find 3 suitable recommendations. Only found ${candidates.length} candidates.`);
  }

  // Step 4: Score candidates for gap fit
  const scoredCandidates: ScoredShoe[] = candidates.map(shoe => ({
    shoe,
    score: 50 + scoreForGapFit(shoe, gap, profile),
  }));

  // Step 5: Select 3 diverse shoes
  const selectedThree = selectDiverseThree(scoredCandidates);

  if (!selectedThree) {
    throw new Error('Unable to select 3 diverse recommendations');
  }

  const [first, second, third] = selectedThree;
  const allThreeShoes = [first, second, third];

  // Step 6: Helper to check heel drop distance
  const getHeelDropDistance = (shoe: Shoe): number => {
    if (!feelPreferences?.heelDropPreference ||
        feelPreferences.heelDropPreference.mode !== 'user_set' ||
        !feelPreferences.heelDropPreference.values) {
      return 0;
    }
    return getHeelDropRangeDistance(
      shoe.heel_drop_mm,
      feelPreferences.heelDropPreference.values
    );
  };

  // Step 7: Badge assignment logic
  const getBadge = (shoe: Shoe, isFirst: boolean, isSecond: boolean): RecommendationBadge => {
    const heelDistance = getHeelDropDistance(shoe);
    if (heelDistance >= 2) return "trade_off";
    if (isFirst) return "closest_match";
    if (isSecond) return "close_match";
    return heelDistance > 0 ? "trade_off" : "close_match";
  };

  // Step 8: Build recommendations with center-emphasis reordering
  const archetypeLabel = gap.recommendedArchetype || 'daily_trainer';

  const recommendations: RecommendedShoe[] = await Promise.all([
    buildRecommendedShoe(second, archetypeLabel, getBadge(second, false, true), currentShoes, catalogue, false, allThreeShoes, "left"),
    buildRecommendedShoe(first, archetypeLabel, getBadge(first, true, false), currentShoes, catalogue, false, allThreeShoes, "center"),
    buildRecommendedShoe(third, archetypeLabel, getBadge(third, false, false), currentShoes, catalogue, true, allThreeShoes, "right"),
  ]);

  console.log('[Badge Assignment]', recommendations.map(r => ({
    name: r.fullName,
    badge: r.badge,
    position: r.position,
    archetypes: r.archetypes
  })));

  return recommendations;
}

/**
 * Build a RecommendedShoe object from a Shoe
 */
async function buildRecommendedShoe(
  shoe: Shoe,
  archetypeLabel: string,
  badge: RecommendationBadge,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  isTradeOff: boolean,
  allThreeShoes: Shoe[],
  position: RecommendationPosition
): Promise<RecommendedShoe> {
  // Generate match description using LLM (with fallback)
  const matchReason = await generateMatchDescription({
    fullName: shoe.full_name,
    archetype: archetypeLabel,
    whyItFeelsThisWay: shoe.why_it_feels_this_way,
    notableDetail: shoe.notable_detail,
    avoidIf: shoe.avoid_if,
    plateTechName: shoe.plate_tech_name,
    plateMaterial: shoe.plate_material,
    wetGrip: shoe.wet_grip,
    weight_g: shoe.weight_g,
    heelDrop_mm: shoe.heel_drop_mm,
    cushion_1to5: shoe.cushion_softness_1to5,
    bounce_1to5: shoe.bounce_1to5,
    stability_1to5: shoe.stability_1to5,
    rocker_1to5: shoe.rocker_1to5
  });

  // Build gap object for strength extraction
  const gap: Gap = {
    type: "coverage",
    severity: "medium",
    reasoning: "",
    recommendedArchetype: archetypeLabel as ShoeArchetype
  };

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
    recommendationType: badge,
    matchReason,
    keyStrengths: extractDifferentiatedStrengths(shoe, gap, allThreeShoes),
    tradeOffs: identifyTradeoffsComparative(shoe, currentShoes, catalogue, isTradeOff, allThreeShoes),
    archetypes: getShoeArchetypes(shoe),
    badge,
    position,
  };
}

// ============================================================================
// DISCOVERY MODE RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Generate recommendations for a specific archetype request (discovery mode)
 */
export async function generateDiscoveryRecommendations(
  request: ShoeRequest,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  chatContext?: ChatContext
): Promise<RecommendedShoe[]> {
  // Step 1: Build constraints for this specific archetype and feel preferences
  const constraints: RetrievalConstraints = {
    archetypes: [request.archetype],
    archetypeContext: request.archetype,
    feelPreferences: request.feelPreferences,
    excludeShoeIds: currentShoes.map(s => s.shoeId),
    profile: profile,
    currentShoes: currentShoes, // For love/dislike tag modifiers
    chatContext: chatContext, // For chat-extracted context (injuries, fit, climate, requests)
    stabilityNeed: (() => {
      const stabPref = request.feelPreferences.stabilityAmount;
      if (stabPref.mode === 'user_set' && stabPref.value !== undefined && stabPref.value >= 4) {
        return "stable_feel" as const;
      }
      return undefined;
    })(),
  };

  // Step 2: Get candidates for this archetype
  let candidates = getCandidates(constraints, catalogue);

  // Step 3: If fewer than 3 candidates, relax constraints
  if (candidates.length < 3) {
    const relatedArchetypes = getRelatedArchetypes(request.archetype);
    const relaxedConstraints = {
      ...constraints,
      archetypes: [request.archetype, ...relatedArchetypes],
    };
    candidates = getCandidates(relaxedConstraints, catalogue);
  }

  if (candidates.length === 0) {
    throw new Error(`Unable to find any shoes for ${request.archetype} with the specified preferences.`);
  }

  // Step 4: Score candidates
  const scoredCandidates: ScoredShoe[] = candidates.map(shoe =>
    scoreShoe(shoe, constraints)
  );

  // Step 5: Select top 2-3 shoes with diversity
  const selectedShoes = selectDiscoveryShoes(scoredCandidates);

  // Step 6: Helper to check heel drop distance
  const getHeelDropDistance = (shoe: Shoe): number => {
    if (!request.feelPreferences?.heelDropPreference ||
        request.feelPreferences.heelDropPreference.mode !== 'user_set' ||
        !request.feelPreferences.heelDropPreference.values) {
      return 0;
    }
    return getHeelDropRangeDistance(
      shoe.heel_drop_mm,
      request.feelPreferences.heelDropPreference.values
    );
  };

  // Step 7: Badge assignment logic
  const getBadge = (shoe: Shoe, isFirst: boolean, isSecond: boolean): RecommendationBadge => {
    const heelDistance = getHeelDropDistance(shoe);
    if (heelDistance >= 2) return "trade_off";
    if (isFirst) return "closest_match";
    if (isSecond) return "close_match";
    return heelDistance > 0 ? "trade_off" : "close_match";
  };

  // Step 8: Build recommendations with center-emphasis reordering
  if (selectedShoes.length === 0) return [];

  const archetypeLabel = request.archetype;
  const allThreeShoes = selectedShoes;

  if (selectedShoes.length === 1) {
    return [
      await buildRecommendedShoe(selectedShoes[0], archetypeLabel, getBadge(selectedShoes[0], true, false), currentShoes, catalogue, false, allThreeShoes, "center"),
    ];
  }

  if (selectedShoes.length === 2) {
    return await Promise.all([
      buildRecommendedShoe(selectedShoes[1], archetypeLabel, getBadge(selectedShoes[1], false, true), currentShoes, catalogue, false, allThreeShoes, "left"),
      buildRecommendedShoe(selectedShoes[0], archetypeLabel, getBadge(selectedShoes[0], true, false), currentShoes, catalogue, false, allThreeShoes, "center"),
    ]);
  }

  return await Promise.all([
    buildRecommendedShoe(selectedShoes[1], archetypeLabel, getBadge(selectedShoes[1], false, true), currentShoes, catalogue, false, allThreeShoes, "left"),
    buildRecommendedShoe(selectedShoes[0], archetypeLabel, getBadge(selectedShoes[0], true, false), currentShoes, catalogue, false, allThreeShoes, "center"),
    buildRecommendedShoe(selectedShoes[2], archetypeLabel, getBadge(selectedShoes[2], false, false), currentShoes, catalogue, true, allThreeShoes, "right"),
  ]);
}

// Keep old function name for backwards compatibility
export const generateShoppingRecommendations = generateDiscoveryRecommendations;

/**
 * Get related archetypes for fallback expansion
 */
function getRelatedArchetypes(archetype: ShoeArchetype): ShoeArchetype[] {
  const relatedMap: Record<ShoeArchetype, ShoeArchetype[]> = {
    'daily_trainer': ['recovery_shoe', 'workout_shoe'],
    'recovery_shoe': ['daily_trainer'],
    'workout_shoe': ['daily_trainer', 'race_shoe'],
    'race_shoe': ['workout_shoe'],
    'trail_shoe': [],
  };
  return relatedMap[archetype] || [];
}

/**
 * Check if two shoes are model variants
 */
function isModelVariant(shoe1: Shoe, shoe2: Shoe): boolean {
  if (shoe1.brand !== shoe2.brand) return false;

  const getBaseModel = (model: string): string => {
    return model
      .toLowerCase()
      .replace(/\s+\d+(\.\d+)?$/g, '')
      .replace(/\s+v\d+$/gi, '')
      .replace(/\s+(x|plus|pro|max)$/gi, '')
      .trim();
  };

  const base1 = getBaseModel(shoe1.model);
  const base2 = getBaseModel(shoe2.model);

  return base1 === base2 || base1.includes(base2) || base2.includes(base1);
}

/**
 * Select 2-3 shoes from scored candidates for discovery mode
 */
function selectDiscoveryShoes(scoredCandidates: ScoredShoe[]): Shoe[] {
  if (scoredCandidates.length === 0) return [];
  if (scoredCandidates.length === 1) return [scoredCandidates[0].shoe];

  const sorted = [...scoredCandidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.shoe.shoe_id.localeCompare(b.shoe.shoe_id);
  });

  const selected: Shoe[] = [];
  let remaining = [...sorted];

  while (selected.length < 3 && remaining.length > 0) {
    const best = remaining[0];
    selected.push(best.shoe);

    remaining = remaining.filter(candidate =>
      candidate.shoe.shoe_id !== best.shoe.shoe_id &&
      !isModelVariant(candidate.shoe, best.shoe)
    );
  }

  return selected;
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
  if (brands.size >= 2) return true;

  const cushionValues = recommendations.map(r => r.cushion_softness_1to5);
  const maxCushionDiff = Math.max(...cushionValues) - Math.min(...cushionValues);

  return maxCushionDiff >= 2;
}
