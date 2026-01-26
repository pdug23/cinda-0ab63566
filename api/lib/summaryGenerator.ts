// ============================================================================
// LLM-POWERED ROTATION SUMMARY GENERATOR
// Uses OpenAI gpt-4o-mini to generate personalized prose summaries
// ============================================================================

import OpenAI from 'openai';
import type {
  RotationSummaryProse,
  RotationHealth,
  TierClassification,
  CurrentShoe,
  RunnerProfile,
  Shoe,
  ShoeArchetype,
  RunType,
  MisuseLevel,
} from '../types.js';
import { getShoeArchetypes } from '../types.js';
import { detectMisuse } from './shoeCapabilities.js';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface SummaryContext {
  // Runner info
  experience: string;
  goal: string;
  runningPattern: string;

  // Weekly volume if provided
  weeklyVolume?: {
    value: number;
    unit: string;  // "km" or "mi"
  };

  // Their shoes (resolved to full details)
  shoes: Array<{
    name: string;
    usedFor: string[];  // run types in plain English
    sentiment: string;
    archetypes: string[];  // what the shoe IS
    // Misuse detection
    misuseLevel?: MisuseLevel;
    misuseMessage?: string;
    // Sentiment tags
    loveTags?: string[];
    dislikeTags?: string[];
  }>;

  // Health scores
  health: {
    coverage: number;
    variety: number;
    loadResilience: number;
    goalAlignment: number;
    overall: number;
  };

  // Tier result
  tier: number;
  confidence: string;
  primaryGap?: {
    archetype: string;
    reason: string;
  };
  secondaryGap?: {
    archetype: string;
    reason: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert enum values to plain English
 */
function toPlainEnglish(value: string): string {
  const mappings: Record<string, string> = {
    // Experience levels
    'beginner': 'beginner',
    'intermediate': 'intermediate',
    'experienced': 'experienced',
    'competitive': 'competitive',

    // Goals
    'general_fitness': 'general fitness',
    'get_faster': 'getting faster',
    'race_training': 'race training',
    'injury_comeback': 'injury comeback',

    // Running patterns
    'infrequent': 'casual/infrequent running',
    'mostly_easy': 'mostly easy runs',
    'structured_training': 'structured training',
    'workout_focused': 'workout focused',

    // Run types
    'all_runs': 'all runs',
    'recovery': 'recovery runs',
    'long_runs': 'long runs',
    'workouts': 'workouts',
    'races': 'races',
    'trail': 'trail running',

    // Archetypes
    'daily_trainer': 'daily trainer',
    'recovery_shoe': 'recovery shoe',
    'workout_shoe': 'workout shoe',
    'race_shoe': 'race shoe',
    'trail_shoe': 'trail shoe',

    // Sentiments
    'love': 'loved',
    'neutral': 'neutral',
    'dislike': 'disliked',
  };

  return mappings[value] || value.replace(/_/g, ' ');
}

/**
 * Build context object from function inputs
 */
function buildContext(
  health: RotationHealth,
  tierResult: TierClassification,
  currentShoes: CurrentShoe[],
  profile: RunnerProfile,
  catalogue: Shoe[]
): SummaryContext {
  // Build shoes array with resolved details including misuse and tags
  const shoes = currentShoes.map(cs => {
    const shoe = catalogue.find(s => s.shoe_id === cs.shoeId);
    if (!shoe) {
      return {
        name: cs.shoeId,
        usedFor: (cs.runTypes || []).map((rt: RunType) => toPlainEnglish(rt)),
        sentiment: toPlainEnglish(cs.sentiment),
        archetypes: [],
      };
    }

    const archetypes = getShoeArchetypes(shoe);

    // Get misuse detection
    const misuse = detectMisuse(cs.runTypes || [], archetypes, shoe);

    return {
      name: shoe.full_name,
      usedFor: (cs.runTypes || []).map((rt: RunType) => toPlainEnglish(rt)),
      sentiment: toPlainEnglish(cs.sentiment),
      archetypes: archetypes.map((a: ShoeArchetype) => toPlainEnglish(a)),
      // Only include misuse if not 'good'
      misuseLevel: misuse.level !== 'good' ? misuse.level : undefined,
      misuseMessage: misuse.level !== 'good' ? misuse.message : undefined,
      // Include love/dislike tags if present
      loveTags: cs.sentiment === 'love' && cs.loveTags?.length ? cs.loveTags : undefined,
      dislikeTags: cs.sentiment === 'dislike' && cs.dislikeTags?.length ? cs.dislikeTags : undefined,
    };
  });

  return {
    experience: toPlainEnglish(profile.experience),
    goal: toPlainEnglish(profile.primaryGoal),
    runningPattern: toPlainEnglish(profile.runningPattern || 'mostly_easy'),
    // Include weekly volume as structured data
    weeklyVolume: profile.weeklyVolume ? {
      value: profile.weeklyVolume.value,
      unit: profile.weeklyVolume.unit,
    } : undefined,
    shoes,
    health: {
      coverage: health.coverage,
      variety: health.variety,
      loadResilience: health.loadResilience,
      goalAlignment: health.goalAlignment,
      overall: health.overall,
    },
    tier: tierResult.tier,
    confidence: tierResult.confidence,
    primaryGap: tierResult.primary ? {
      archetype: toPlainEnglish(tierResult.primary.archetype),
      reason: tierResult.primary.reason,
    } : undefined,
    secondaryGap: tierResult.secondary ? {
      archetype: toPlainEnglish(tierResult.secondary.archetype),
      reason: tierResult.secondary.reason,
    } : undefined,
  };
}

// ============================================================================
// PROMPT CONSTRUCTION
// ============================================================================

const SYSTEM_PROMPT = `You are Cinda, an expert running shoe advisor. You analyze runners' shoe rotations and provide personalized, insightful summaries.

Your tone is:
- Confident but not pushy
- Knowledgeable like a specialty running store employee
- Warm and encouraging
- Concise - no fluff or filler phrases

You must respond with valid JSON only, no markdown, no explanation.`;

function buildUserPrompt(context: SummaryContext): string {
  // Build shoes section with misuse warnings and sentiment tags
  const shoesSection = context.shoes.length > 0
    ? context.shoes.map(s => {
        let line = `- ${s.name}: used for ${s.usedFor.join(', ')} (${s.sentiment}). This shoe is a ${s.archetypes.join(', ')}.`;

        if (s.misuseLevel && s.misuseMessage) {
          line += `\n  ⚠️ MISUSE (${s.misuseLevel}): ${s.misuseMessage}`;
        }

        if (s.loveTags?.length) {
          line += `\n  Loves: ${s.loveTags.join(', ')}`;
        }

        if (s.dislikeTags?.length) {
          line += `\n  Dislikes: ${s.dislikeTags.join(', ')}`;
        }

        return line;
      }).join('\n')
    : '- No shoes added yet';

  // Build volume string
  const volumeString = context.weeklyVolume
    ? `- Weekly volume: ${context.weeklyVolume.value} ${context.weeklyVolume.unit}`
    : '';

  // Check for load resilience warning
  const loadResilienceWarning = context.health.loadResilience < 70
    ? ' ⚠️ LOW - not enough shoes for their volume, EMPHASIZE THIS'
    : '';

  // Check for high-volume small rotation
  const isHighVolumeSmallRotation = context.weeklyVolume &&
    context.weeklyVolume.value >= 50 &&
    context.shoes.length <= 2;

  return `Analyze this runner's shoe rotation and generate a summary.

## Runner Profile
- Experience: ${context.experience}
- Goal: ${context.goal}
- Running pattern: ${context.runningPattern}
${volumeString}

## Current Shoes
${shoesSection}

## Rotation Health Scores (0-100)
- Coverage: ${context.health.coverage} (do they have shoes for their needs?)
- Load Resilience: ${context.health.loadResilience}${loadResilienceWarning}
- Variety: ${context.health.variety} (range of different feels?)
- Goal Alignment: ${context.health.goalAlignment} (rotation supports their goal?)
- Overall: ${context.health.overall}
${isHighVolumeSmallRotation ? '\n⚠️ HIGH VOLUME ON SMALL ROTATION: This runner is doing 50+ km/week on only ' + context.shoes.length + ' shoe(s). Load distribution is a critical concern.' : ''}

## Recommendation Tier
Tier ${context.tier} (${context.confidence} confidence)
${context.tier === 1 ? 'Tier 1 = Genuine gap - they are missing something important' : ''}
${context.tier === 2 ? 'Tier 2 = Room for improvement - basics covered but could be better' : ''}
${context.tier === 3 ? 'Tier 3 = Solid rotation - suggest exploration/variety' : ''}

${context.primaryGap ? `Primary recommendation: ${context.primaryGap.archetype} - ${context.primaryGap.reason}` : ''}
${context.secondaryGap ? `Secondary recommendation: ${context.secondaryGap.archetype} - ${context.secondaryGap.reason}` : ''}

## Your Task

Generate a rotation summary with:

1. **prose**: 2-3 sentences describing their rotation naturally.
   - You MUST mention ALL shoes by name (e.g., "The Clifton 10 handles recovery, while the Pegasus 41 covers daily runs")
   - For single-shoe rotations, name the shoe and what it covers
   - For multi-shoe rotations (3+), briefly describe the role of each shoe
   - For Tier 1: acknowledge what they have, then highlight the gap
   - For Tier 2: acknowledge good coverage, suggest the improvement
   - For Tier 3: celebrate the rotation, offer exploration idea
   - Don't start with "You have" or "Your rotation" - vary your openings
   - Don't use filler phrases like "Overall" or "In summary"

2. **strengths**: 1-3 short bullet points of what's genuinely good about their rotation
   - Be specific, not generic
   - Only include if actually true based on the scores
   - Examples: "Recovery days are well protected", "Race day speed sorted with the Vaporfly"

3. **improvements**: 0-3 short bullet points of what could be better
   - For Tier 1: focus on the gaps (1-2 items)
   - For Tier 2: the improvement opportunity (1 item)
   - For Tier 3: optional soft suggestion or empty array
   - Phrase as actionable: "Add a..." or "Consider a..."

Additional guidance:
- NEVER mention specific health scores or numbers to the user (e.g., "variety score of 13", "coverage of 85%") - these are internal metrics
- If weekly volume is provided, reference it when discussing load or shoe count (e.g., "At 60km per week...")
- For runners doing 50km+ per week on 1-2 shoes, ALWAYS emphasize load distribution and injury prevention - this is a critical concern
- When load resilience score is below 70, lead with the volume/load issue before discussing performance gaps
- Frame load issues in terms of injury prevention and shoe longevity, not just performance
- If a shoe has a MISUSE warning, address it directly in the prose - this is important feedback
- If the user has love/dislike tags, you can reference what they enjoy (e.g., "Since you love bouncy shoes...")
- Be specific about misuse: "Using a race shoe for recovery runs wears it out without benefit"

Complete rotation guidance (when coverage is 100% and Tier 3):
- The rotation is COMPLETE - celebrate this achievement genuinely
- Tone should be warm and congratulatory, not clinical
- Use phrases like "covers all your training needs", "well-rounded rotation", "solid setup", "you're set"
- Do NOT use "However" or "That said" to pivot to recommendations - keep the celebration pure
- Any recommendations should be framed as OPTIONAL exploration, not necessities
- Use phrases like "If you're ever curious...", "For fun, you could explore...", "for variety" - NOT "you need" or "you'd benefit from"
- For improvements, prefer empty array or very soft suggestions like "If you want to explore..."
- Never suggest they "need" something when coverage is 100%

Respond with this exact JSON structure:
{
  "prose": "string",
  "strengths": ["string", ...],
  "improvements": ["string", ...]
}`;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateSummary(result: unknown): RotationSummaryProse {
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid response structure');
  }

  const r = result as Record<string, unknown>;

  if (typeof r.prose !== 'string' || r.prose.length < 20) {
    throw new Error('Invalid prose');
  }

  if (!Array.isArray(r.strengths) || r.strengths.length > 5) {
    throw new Error('Invalid strengths');
  }

  if (!Array.isArray(r.improvements) || r.improvements.length > 5) {
    throw new Error('Invalid improvements');
  }

  return {
    prose: r.prose,
    strengths: r.strengths.filter((s): s is string => typeof s === 'string').slice(0, 3),
    improvements: r.improvements.filter((s): s is string => typeof s === 'string').slice(0, 3),
  };
}

// ============================================================================
// FALLBACK GENERATOR
// ============================================================================

function generateFallback(
  health: RotationHealth,
  tierResult: TierClassification,
  currentShoes: CurrentShoe[]
): RotationSummaryProse {
  const shoeCount = currentShoes.length;

  let prose: string;
  if (shoeCount === 0) {
    prose = "No shoes in your rotation yet. Let's find the right one to get you started.";
  } else if (shoeCount === 1) {
    prose = `You have one shoe in your rotation. ${tierResult.tier === 1 ? "There's room to build out your setup for your goals." : "It's covering your basics."}`;
  } else {
    prose = `You have ${shoeCount} shoes in your rotation. ${health.overall >= 70 ? "Your setup is working well." : "There may be some gaps to address."}`;
  }

  const strengths: string[] = [];
  if (health.coverage >= 70) strengths.push('Good coverage across your running needs');
  if (health.goalAlignment >= 80) strengths.push('Rotation supports your training goal');
  if (health.loadResilience >= 80) strengths.push('Enough shoes for your volume');

  const improvements: string[] = [];
  if (tierResult.primary) {
    improvements.push(tierResult.primary.reason);
  }

  return { prose, strengths, improvements };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate personalized prose summary of runner's rotation using LLM
 */
export async function generateRotationSummary(
  health: RotationHealth,
  tierResult: TierClassification,
  currentShoes: CurrentShoe[],
  profile: RunnerProfile,
  catalogue: Shoe[]
): Promise<RotationSummaryProse> {
  // Build context
  const context = buildContext(health, tierResult, currentShoes, profile, catalogue);

  console.log('[generateRotationSummary] Context:', {
    shoeCount: context.shoes.length,
    tier: context.tier,
    healthOverall: context.health.overall,
    hasVolume: !!context.weeklyVolume,
    hasMisuse: context.shoes.some(s => s.misuseLevel),
    hasLoveTags: context.shoes.some(s => s.loveTags?.length),
    hasDislikeTags: context.shoes.some(s => s.dislikeTags?.length),
  });

  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Call LLM
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(context) }
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate
    const parsed = JSON.parse(content);
    const result = validateSummary(parsed);

    console.log('[generateRotationSummary] Generated:', {
      proseLength: result.prose.length,
      strengthsCount: result.strengths.length,
      improvementsCount: result.improvements.length,
    });

    return result;

  } catch (error) {
    console.error('[generateRotationSummary] LLM call failed:', error);

    // Return fallback
    const fallback = generateFallback(health, tierResult, currentShoes);

    console.log('[generateRotationSummary] Using fallback:', {
      proseLength: fallback.prose.length,
      strengthsCount: fallback.strengths.length,
      improvementsCount: fallback.improvements.length,
    });

    return fallback;
  }
}
