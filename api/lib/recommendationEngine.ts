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
 * User context for bullet generation - either gap-based (Full Analysis) or preference-based (Quick Match)
 */
interface BulletUserContext {
  mode: 'full_analysis' | 'quick_match';
  // Full Analysis mode: current rotation and gap info
  currentShoeNames?: string[];  // e.g., ["Clifton 9", "Vaporfly 3"]
  currentShoeUses?: string[];   // e.g., ["easy runs", "races"]
  gapReasoning?: string;        // e.g., "needs workout shoe for tempo/intervals"
  gapType?: string;             // e.g., "coverage", "performance"
  // Quick Match mode: feel preferences
  preferredCushion?: number;    // 1-5
  preferredBounce?: number;     // 1-5
  preferredStability?: number;  // 1-5
}

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
  // Fit details for education bullet
  fit_volume: string;
  toe_box: string;
  support_type: string;
  // Actual shoe archetype flags (what this shoe IS)
  is_daily_trainer: boolean;
  is_recovery_shoe: boolean;
  is_workout_shoe: boolean;
  is_race_shoe: boolean;
  is_trail_shoe: boolean;
  // New fields for redesigned bullets
  is_super_trainer: boolean;
  common_issues: string[];
  // User context for personalization
  userContext: BulletUserContext;
}

/**
 * Generate personalized match description bullets using gpt-4o-mini
 * Returns three bullets: Personal Match, Education, Standout + Use Case
 */
async function generateMatchDescription(params: MatchDescriptionParams): Promise<string[]> {
  console.log('[generateMatchDescription] Called for:', params.fullName);

  const archetypeLabel = params.archetype.replace('_', ' ');
  const ctx = params.userContext;

  // Build user context section based on mode
  let userContextSection: string;
  if (ctx.mode === 'full_analysis' && ctx.currentShoeNames && ctx.currentShoeNames.length > 0) {
    const rotationDesc = ctx.currentShoeNames.map((name, i) =>
      `${name} (${ctx.currentShoeUses?.[i] || 'general'})`
    ).join(', ');
    userContextSection = `USER'S CURRENT ROTATION: ${rotationDesc}
GAP IDENTIFIED: ${ctx.gapReasoning || `Needs ${archetypeLabel}`}`;
  } else {
    // Quick Match mode - preference based
    const cushionDesc = ctx.preferredCushion ? (ctx.preferredCushion <= 2 ? 'firm' : ctx.preferredCushion >= 4 ? 'soft/plush' : 'moderate') : 'balanced';
    const bounceDesc = ctx.preferredBounce ? (ctx.preferredBounce <= 2 ? 'muted' : ctx.preferredBounce >= 4 ? 'high bounce' : 'balanced') : 'balanced';
    const stabilityDesc = ctx.preferredStability ? (ctx.preferredStability <= 2 ? 'neutral/flexible' : ctx.preferredStability >= 4 ? 'stable/supportive' : 'moderate') : 'balanced';
    userContextSection = `USER'S PREFERENCES: ${cushionDesc} cushion, ${bounceDesc} response, ${stabilityDesc} stability
SEARCHING FOR: ${archetypeLabel}`;
  }

  // Build fit description
  const fitDesc = `${params.fit_volume} volume, ${params.toe_box} toe box, ${params.support_type} support`;

  // Build common issues warning (only if critical)
  const criticalIssues = params.common_issues.filter(issue =>
    issue.toLowerCase().includes('size') ||
    issue.toLowerCase().includes('narrow') ||
    issue.toLowerCase().includes('wide')
  );
  const issueNote = criticalIssues.length > 0
    ? `\nCRITICAL FIT NOTE (mention briefly if relevant): ${criticalIssues[0]}`
    : '';

  // Super trainer instruction
  const superTrainerNote = params.is_super_trainer
    ? '\nSUPER TRAINER: Yes - this shoe handles easy recovery through hard intervals. Mention this versatility in bullet 3.'
    : '';

  const prompt = `Write 3 personalized shoe recommendation bullets for a runner.

SHOE: ${params.fullName}
RECOMMENDED AS: ${archetypeLabel}

${userContextSection}

SHOE RIDE & FEEL:
${params.whyItFeelsThisWay}

STANDOUT FEATURE:
${params.notableDetail}

FIT DETAILS: ${fitDesc}

SPECS (context only, don't output numbers):
- Cushion: ${params.cushion_1to5}/5, Bounce: ${params.bounce_1to5}/5
- Stability: ${params.stability_1to5}/5, Rocker: ${params.rocker_1to5}/5
- ${params.plateTechName ? `Has ${params.plateTechName} plate` : 'No plate'}${superTrainerNote}${issueNote}

Write exactly 3 bullets. Max 15 words each. No bullet numbers or prefixes.

BULLET 1 - PERSONAL MATCH:
${ctx.mode === 'full_analysis'
  ? '- Reference their current shoes BY NAME (e.g., "Fills the tempo gap between your Clifton\'s comfort and your Vaporfly\'s race snap")'
  : '- Reference their preferences (e.g., "Your preference for balanced cushion with high bounce matches this responsive trainer perfectly")'}
- Explain WHY this shoe fits their situation
- Make it feel personally chosen for them

BULLET 2 - EDUCATION:
- Teach ONE thing about how this shoe rides or fits
- Priority: ride characteristics > fit details > stability
- DO NOT list problems or common issues
- Example: "The smooth rocker guides you naturally while the flexible forefoot preserves your natural cadence"

BULLET 3 - STANDOUT + USE CASE:
- Lead with the notable feature/tech
${params.is_super_trainer ? '- MUST mention "rare versatility handles easy through tempo" or similar super trainer capability' : '- End with when/how to use it'}
- Example: "ReactX foam stays responsive through marathon pace - ideal for your everyday training efforts"

RULES:
- Use em dashes only in bullet 3 to separate feature from use case
- British spelling
- Conversational, not marketing-speak

SENTENCE QUALITY (CRITICAL):
- Write proper, complete sentences with all necessary articles (a, an, the)
- Don't drop helper words (and, while, with, for, etc.) to force word limits
- Don't write in "telegram style" or compressed syntax
- If a sentence doesn't fit naturally in 15 words, rephrase it completely
- Prioritize readability over hitting exactly 15 words (14 natural words beats 15 robotic words)

BAD examples (robotic, missing words):
- "Fills tempo gap between Clifton comfort and Vaporfly snap"
- "Smooth rocker guides naturally, flexible forefoot preserves cadence"

GOOD examples (complete, natural sentences):
- "Fills the tempo gap between your Clifton's comfort and your Vaporfly's race focus"
- "The smooth rocker guides naturally while the flexible forefoot preserves your cadence"`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content?.trim();
    console.log('[generateMatchDescription] LLM response:', content);

    if (content) {
      // Clean up numbered prefixes like "1. " or "1) " or "- " or "BULLET 1:"
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('BULLET'))
        .map(line => line
          .replace(/^[\d]+[.\)]\s*/, '')
          .replace(/^[-•]\s*/, '')
          .replace(/^\*\*.*?\*\*:?\s*/, '')
          .trim()
        )
        .filter(line => line.length > 5); // Filter out very short lines

      // Remove trailing periods for consistency
      const normalizedLines = lines.map(line => line.replace(/\.$/, ''));

      // Enforce 15-word limit
      const enforceWordLimit = (bullet: string): string => {
        const words = bullet.trim().split(/\s+/);
        if (words.length > 15) {
          console.log(`[generateMatchDescription] Truncating bullet from ${words.length} to 15 words`);
          return words.slice(0, 15).join(' ');
        }
        return bullet;
      };

      const truncatedLines = normalizedLines.map(enforceWordLimit);
      console.log('[generateMatchDescription] Parsed bullets:', truncatedLines);

      if (truncatedLines.length >= 3) {
        return [truncatedLines[0], truncatedLines[1], truncatedLines[2]];
      } else if (truncatedLines.length === 2) {
        return [truncatedLines[0], truncatedLines[1], enforceWordLimit(params.notableDetail.replace(/\.$/, ''))];
      } else if (truncatedLines.length === 1) {
        return [truncatedLines[0], enforceWordLimit(params.whyItFeelsThisWay.slice(0, 100)), enforceWordLimit(params.notableDetail)];
      }
    }
  } catch (error) {
    console.error('[generateMatchDescription] OpenAI API error:', error);
  }

  // Fallback if API fails - still try to be personal
  console.log('[generateMatchDescription] Using fallback bullets');
  const fallbackBullet1 = ctx.mode === 'full_analysis' && ctx.gapReasoning
    ? `Addresses your ${ctx.gapType || 'coverage'} gap with responsive ${archetypeLabel} capability`
    : `Matches your preference for ${archetypeLabel} with balanced, versatile performance`;

  return [
    enforceWordLimit(fallbackBullet1),
    enforceWordLimit(params.whyItFeelsThisWay.slice(0, 80)),
    enforceWordLimit(params.notableDetail + (params.is_super_trainer ? ' - rare versatility for varied training' : ''))
  ];

  function enforceWordLimit(bullet: string): string {
    const words = bullet.trim().split(/\s+/);
    return words.length > 15 ? words.slice(0, 15).join(' ') : bullet;
  }
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
    breakdown: {
      archetypeScore: 50,
      feelScore: 0,
      heelDropScore: 0,
      stabilityBonus: 0,
      availabilityBonus: 0,
      superTrainerBonus: 0,
      footStrikeScore: 0,
      experienceScore: 0,
      primaryGoalScore: scoreForGapFit(shoe, gap, profile),
      runningPatternScore: 0,
      paceBucketScore: 0,
      bmiScore: 0,
      trailScore: 0,
      loveDislikeScore: 0,
      chatContextScore: 0,
      contrastScore: 0,
    },
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

  // Build user context for personalized bullets (Full Analysis mode)
  const userContext: BulletUserContext = {
    mode: 'full_analysis',
    currentShoeNames: currentShoes.map(cs => {
      const shoe = catalogue.find(s => s.shoe_id === cs.shoeId);
      return shoe?.full_name || cs.shoeId;
    }),
    currentShoeUses: currentShoes.map(cs => cs.runTypes?.join('/') || 'general'),
    gapReasoning: gap.reasoning,
    gapType: gap.type,
  };

  const recommendations: RecommendedShoe[] = await Promise.all([
    buildRecommendedShoe(second, archetypeLabel, getBadge(second, false, true), currentShoes, catalogue, false, allThreeShoes, "left", userContext),
    buildRecommendedShoe(first, archetypeLabel, getBadge(first, true, false), currentShoes, catalogue, false, allThreeShoes, "center", userContext),
    buildRecommendedShoe(third, archetypeLabel, getBadge(third, false, false), currentShoes, catalogue, true, allThreeShoes, "right", userContext),
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
  position: RecommendationPosition,
  userContext: BulletUserContext
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
    rocker_1to5: shoe.rocker_1to5,
    // Fit details for education bullet
    fit_volume: shoe.fit_volume,
    toe_box: shoe.toe_box,
    support_type: shoe.support_type,
    // Actual shoe archetype flags (what this shoe IS)
    is_daily_trainer: shoe.is_daily_trainer,
    is_recovery_shoe: shoe.is_recovery_shoe,
    is_workout_shoe: shoe.is_workout_shoe,
    is_race_shoe: shoe.is_race_shoe,
    is_trail_shoe: shoe.is_trail_shoe,
    // New fields for redesigned bullets
    is_super_trainer: shoe.is_super_trainer,
    common_issues: shoe.common_issues || [],
    // User context for personalization
    userContext,
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
    is_super_trainer: shoe.is_super_trainer,
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
    feelGap: request.feelGap, // Pass feel gap from rotation analysis for cinda_decides scoring
    contrastWith: request.contrastWith, // For variety mode (Tier 3) - favor shoes different from rotation
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

  // Build user context for personalized bullets (Quick Match mode - preference based)
  // Extract numeric preference values for the prompt
  const getPreferenceValue = (pref: { mode: string; value?: number }): number | undefined => {
    return pref.mode === 'user_set' ? pref.value : undefined;
  };

  const userContext: BulletUserContext = {
    mode: 'quick_match',
    preferredCushion: getPreferenceValue(request.feelPreferences.cushionAmount),
    preferredBounce: getPreferenceValue(request.feelPreferences.energyReturn),
    preferredStability: getPreferenceValue(request.feelPreferences.stabilityAmount),
  };

  if (selectedShoes.length === 1) {
    return [
      await buildRecommendedShoe(selectedShoes[0], archetypeLabel, getBadge(selectedShoes[0], true, false), currentShoes, catalogue, false, allThreeShoes, "center", userContext),
    ];
  }

  if (selectedShoes.length === 2) {
    return await Promise.all([
      buildRecommendedShoe(selectedShoes[1], archetypeLabel, getBadge(selectedShoes[1], false, true), currentShoes, catalogue, false, allThreeShoes, "left", userContext),
      buildRecommendedShoe(selectedShoes[0], archetypeLabel, getBadge(selectedShoes[0], true, false), currentShoes, catalogue, false, allThreeShoes, "center", userContext),
    ]);
  }

  return await Promise.all([
    buildRecommendedShoe(selectedShoes[1], archetypeLabel, getBadge(selectedShoes[1], false, true), currentShoes, catalogue, false, allThreeShoes, "left", userContext),
    buildRecommendedShoe(selectedShoes[0], archetypeLabel, getBadge(selectedShoes[0], true, false), currentShoes, catalogue, false, allThreeShoes, "center", userContext),
    buildRecommendedShoe(selectedShoes[2], archetypeLabel, getBadge(selectedShoes[2], false, false), currentShoes, catalogue, true, allThreeShoes, "right", userContext),
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
