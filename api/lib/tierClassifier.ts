// ============================================================================
// TIER CLASSIFICATION LOGIC
// Determines recommendation tier, confidence, and gaps based on rotation health
// ============================================================================

import type {
  TierClassification,
  RecommendationSlot,
  RotationHealth,
  RotationAnalysis,
  RunnerProfile,
  CurrentShoe,
  Shoe,
  ShoeArchetype,
  FeelGapInfo,
  ContrastProfile,
} from '../types.js';
import { resolveShoes } from '../types.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if rotation has any plated shoes
 */
function hasPlatedShoe(currentShoes: CurrentShoe[], catalogue: Shoe[]): boolean {
  const shoes = resolveShoes(currentShoes, catalogue);
  return shoes.some(s => s.has_plate === true);
}

/**
 * Get heel drop range in rotation
 */
function getDropRange(currentShoes: CurrentShoe[], catalogue: Shoe[]): { min: number; max: number } {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) return { min: 0, max: 0 };
  const drops = shoes.map(s => s.heel_drop_mm);
  return { min: Math.min(...drops), max: Math.max(...drops) };
}

/**
 * Get cushion range in rotation
 */
function getCushionRange(currentShoes: CurrentShoe[], catalogue: Shoe[]): { min: number; max: number } {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) return { min: 0, max: 0 };
  const cushions = shoes.map(s => s.cushion_softness_1to5);
  return { min: Math.min(...cushions), max: Math.max(...cushions) };
}

/**
 * Get rocker range in rotation
 */
function getRockerRange(currentShoes: CurrentShoe[], catalogue: Shoe[]): { min: number; max: number } {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) return { min: 0, max: 0 };
  const rockers = shoes.map(s => s.rocker_1to5);
  return { min: Math.min(...rockers), max: Math.max(...rockers) };
}

/**
 * Get weekly volume in km
 */
function getVolumeKm(profile: RunnerProfile): number {
  if (!profile.weeklyVolume) return 0;
  return profile.weeklyVolume.unit === "mi"
    ? profile.weeklyVolume.value * 1.6
    : profile.weeklyVolume.value;
}

/**
 * Check if runner does workouts (structured training or workout focused)
 */
function doesWorkouts(profile: RunnerProfile): boolean {
  return profile.runningPattern === "structured_training" ||
         profile.runningPattern === "workout_focused" ||
         profile.primaryGoal === "race_training" ||
         profile.primaryGoal === "get_faster";
}

/**
 * Get critical archetypes for a profile - these MUST be present for good alignment
 */
function getCriticalArchetypes(profile: RunnerProfile): ShoeArchetype[] {
  const critical: ShoeArchetype[] = [];

  // Everyone needs a daily trainer as foundation
  critical.push("daily_trainer");

  // Goal-specific critical archetypes
  switch (profile.primaryGoal) {
    case "race_training":
      critical.push("workout_shoe");
      critical.push("race_shoe");
      break;
    case "get_faster":
      critical.push("workout_shoe");
      break;
    case "injury_comeback":
      critical.push("recovery_shoe");
      break;
  }

  // Trail is critical if they run trails primarily
  if (profile.trailRunning === "most_or_all") {
    critical.push("trail_shoe");
  }

  return critical;
}

// ============================================================================
// FEEL GAP HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user profile suggests they would benefit from stability
 * Only recommend stability if:
 * - User is beginner (may need support)
 * - User is coming back from injury (needs support)
 * - User has explicitly disliked unstable shoes
 */
function shouldRecommendStability(
  currentShoes: CurrentShoe[],
  profile: RunnerProfile
): boolean {
  // Check if all shoes are low stability (threshold ≤ 2)
  // This is a prerequisite - if they already have stable shoes, no need
  // Note: This is checked by the caller, but we double-check here

  // Check profile conditions
  if (profile.experience === 'beginner') {
    return true;
  }

  if (profile.primaryGoal === 'injury_comeback') {
    return true;
  }

  // Check if any current shoe has 'unstable' dislike tag
  const hasUnstableDislike = currentShoes.some(shoe =>
    shoe.dislikeTags && shoe.dislikeTags.includes('unstable')
  );

  return hasUnstableDislike;
}

/**
 * Check if drop variety is low (all shoes within 4mm of each other)
 */
function hasLowDropVariety(currentShoes: CurrentShoe[], catalogue: Shoe[]): boolean {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) return false;

  const drops = shoes.map(s => s.heel_drop_mm);
  const dropRange = Math.max(...drops) - Math.min(...drops);

  return dropRange < 4;
}

/**
 * Get drop variety recommendation based on current rotation's average drop
 */
function getDropVarietyRecommendation(currentShoes: CurrentShoe[], catalogue: Shoe[]): {
  suggestion: string;
  reason: string;
} {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) {
    return {
      suggestion: 'Consider any drop for variety',
      reason: 'Adding drop variety can help work different muscles'
    };
  }

  const drops = shoes.map(s => s.heel_drop_mm);
  const avgDrop = drops.reduce((a, b) => a + b, 0) / drops.length;

  if (avgDrop >= 8) {
    // All high drops
    return {
      suggestion: 'Consider 4-6mm drop for variety',
      reason: 'All your shoes have high drops (8mm+) - a lower drop shoe adds variety and strengthens different muscles'
    };
  } else if (avgDrop <= 4) {
    // All low drops
    return {
      suggestion: 'Consider 8-10mm drop for variety',
      reason: 'All your shoes have low drops (4mm or less) - a higher drop shoe provides different feel and load distribution'
    };
  } else {
    // All moderate drops
    return {
      suggestion: 'Consider either 0-4mm or 8-10mm drop',
      reason: 'All your shoes have moderate drops (5-7mm) - exploring higher or lower adds useful variety'
    };
  }
}

/**
 * Count daily trainers in current rotation
 */
function getDailyTrainerCount(currentShoes: CurrentShoe[], catalogue: Shoe[]): number {
  const shoes = resolveShoes(currentShoes, catalogue);
  return shoes.filter(s => s.is_daily_trainer).length;
}

/**
 * Check if user is beginner or injury-comeback (for priority routing)
 */
function isBeginnerOrInjuryComeback(profile: RunnerProfile): boolean {
  return profile.experience === 'beginner' || profile.primaryGoal === 'injury_comeback';
}

/**
 * Generate dynamic reason text for daily trainer recommendations
 * Avoids hardcoded "second daily trainer" when user may have more
 */
function getDailyTrainerReasonText(dailyCount: number, context: 'variety' | 'load_sharing'): string {
  if (context === 'variety') {
    if (dailyCount === 0) {
      return "A daily trainer would anchor your rotation and handle your regular mileage.";
    } else if (dailyCount === 1) {
      return "A second daily trainer with a different feel could add variety and share the load.";
    } else {
      return "Another daily trainer with a different feel could add more variety to your rotation.";
    }
  } else {
    // load_sharing context
    if (dailyCount === 0) {
      return "Adding a daily trainer would help spread your training load.";
    } else if (dailyCount === 1) {
      return "A second daily trainer would help spread the load and protect your legs.";
    } else {
      return "Another daily trainer would help spread the load across more shoes.";
    }
  }
}

// ============================================================================
// CONTRAST PROFILE
// ============================================================================

/**
 * Build a contrast profile from the user's current rotation
 * Used for variety recommendations - favors shoes that differ from this profile
 */
function buildContrastProfile(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): ContrastProfile {
  const shoes = resolveShoes(currentShoes, catalogue);

  if (shoes.length === 0) return {};

  // Calculate average feel across rotation
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  const profile: ContrastProfile = {
    cushion: avg(shoes.map(s => s.cushion_softness_1to5)),
    stability: avg(shoes.map(s => s.stability_1to5)),
    bounce: avg(shoes.map(s => s.bounce_1to5)),
    rocker: avg(shoes.map(s => s.rocker_1to5)),
    groundFeel: avg(shoes.map(s => s.ground_feel_1to5)),
  };

  console.log('[buildContrastProfile] Current rotation averages:', profile);

  return profile;
}

// ============================================================================
// FEEL GAP DETECTION
// ============================================================================

/**
 * Describes a gap in feel variety that could be explored
 */
interface FeelGap {
  dimension: 'drop' | 'cushion' | 'rocker' | 'stability' | 'bounce' | 'daily_count';
  priority: number;  // Lower = more important (1 = highest priority)
  currentRange: { min: number; max: number };
  suggestion: 'low' | 'high' | 'variety';  // Which end to explore, or 'variety' for daily trainer
  reason: string;
  recommendedArchetype: ShoeArchetype;
  dropSuggestion?: string;  // For drop variety - provides guidance text (e.g., "Consider 4-6mm drop")
}

/**
 * Detect feel gaps for beginners / injury-comeback users
 * Priority order: Max Cushion → Stability Gap → Different Daily → Drop Variety
 */
function detectBeginnerPriorities(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  profile: RunnerProfile
): FeelGap[] {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) return [];

  const shoeCount = shoes.length;
  const gaps: FeelGap[] = [];

  // Calculate values
  const cushions = shoes.map(s => s.cushion_softness_1to5);
  const stabilities = shoes.map(s => s.stability_1to5);
  const drops = shoes.map(s => s.heel_drop_mm);
  const dailyCount = getDailyTrainerCount(currentShoes, catalogue);

  const cushionMax = Math.max(...cushions);
  const stabilityMax = Math.max(...stabilities);

  console.log('[detectBeginnerPriorities] Analyzing:', {
    shoeCount,
    cushions,
    stabilities,
    dailyCount
  });

  // Priority 1: Max cushion gap (no shoe has cushion 5)
  if (cushionMax < 5) {
    gaps.push({
      dimension: 'cushion',
      priority: 1,
      currentRange: { min: Math.min(...cushions), max: cushionMax },
      suggestion: 'high',
      reason: shoeCount === 1
        ? "Your shoe is moderate cushion. A max-cushion option could protect your legs on easy days."
        : "None of your shoes have max cushion. A plush recovery shoe could protect your legs on easy days.",
      recommendedArchetype: 'recovery_shoe'
    });
  }

  // Priority 2: Stability gap (conditional - only if profile suggests need)
  if (stabilityMax <= 2 && shouldRecommendStability(currentShoes, profile)) {
    gaps.push({
      dimension: 'stability',
      priority: 2,
      currentRange: { min: Math.min(...stabilities), max: stabilityMax },
      suggestion: 'high',
      reason: shoeCount === 1
        ? "Your shoe is neutral. A more stable shoe could provide better support and reduce injury risk."
        : "Your rotation is all neutral. A more stable shoe could provide better support and reduce injury risk.",
      recommendedArchetype: 'daily_trainer'
    });
  }

  // Priority 3: Different daily trainer (only one daily)
  if (dailyCount === 1) {
    gaps.push({
      dimension: 'daily_count',
      priority: 3,
      currentRange: { min: dailyCount, max: dailyCount },
      suggestion: 'variety',
      reason: "You rely on one daily trainer - rotating between different dailies reduces overuse and adds variety.",
      recommendedArchetype: 'daily_trainer'
    });
  }

  // Priority 4: Drop variety (all drops within 4mm)
  if (hasLowDropVariety(currentShoes, catalogue)) {
    const dropRec = getDropVarietyRecommendation(currentShoes, catalogue);
    gaps.push({
      dimension: 'drop',
      priority: 4,
      currentRange: { min: Math.min(...drops), max: Math.max(...drops) },
      suggestion: Math.max(...drops) >= 6 ? 'low' : 'high',
      reason: dropRec.reason,
      recommendedArchetype: 'daily_trainer',
      dropSuggestion: dropRec.suggestion
    });
  }

  // Sort by priority
  gaps.sort((a, b) => a.priority - b.priority);

  console.log('[detectBeginnerPriorities] Gaps found:', gaps.map(g => `${g.dimension} (p${g.priority})`));

  return gaps;
}

/**
 * Detect feel gaps for intermediate / advanced users
 * Priority order: Max Cushion → Bounce Gap → Different Daily → Drop Variety → Stability Gap
 */
function detectAdvancedPriorities(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  profile: RunnerProfile
): FeelGap[] {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) return [];

  const shoeCount = shoes.length;
  const gaps: FeelGap[] = [];

  // Calculate values
  const cushions = shoes.map(s => s.cushion_softness_1to5);
  const bounces = shoes.map(s => s.bounce_1to5);
  const stabilities = shoes.map(s => s.stability_1to5);
  const drops = shoes.map(s => s.heel_drop_mm);
  const dailyCount = getDailyTrainerCount(currentShoes, catalogue);

  const cushionMax = Math.max(...cushions);
  const bounceMax = Math.max(...bounces);
  const stabilityMax = Math.max(...stabilities);

  console.log('[detectAdvancedPriorities] Analyzing:', {
    shoeCount,
    cushions,
    bounces,
    stabilities,
    dailyCount
  });

  // Priority 1: Max cushion gap (no shoe has cushion 5)
  if (cushionMax < 5) {
    gaps.push({
      dimension: 'cushion',
      priority: 1,
      currentRange: { min: Math.min(...cushions), max: cushionMax },
      suggestion: 'high',
      reason: shoeCount === 1
        ? "Your shoe is moderate cushion. A max-cushion option could protect your legs on easy days."
        : "None of your shoes have max cushion. A plush recovery shoe could protect your legs on easy days.",
      recommendedArchetype: 'recovery_shoe'
    });
  }

  // Priority 2: Bounce gap (no shoe has bounce >= 4)
  if (bounceMax < 4) {
    // Choose archetype based on running pattern
    const archetype: ShoeArchetype = profile.runningPattern === 'structured_training'
      ? 'workout_shoe'
      : 'daily_trainer';

    gaps.push({
      dimension: 'bounce',
      priority: 2,
      currentRange: { min: Math.min(...bounces), max: bounceMax },
      suggestion: 'high',
      reason: "A bouncy shoe adds versatility for faster efforts and tempo runs.",
      recommendedArchetype: archetype
    });
  }

  // Priority 3: Different daily trainer (only one daily)
  if (dailyCount === 1) {
    gaps.push({
      dimension: 'daily_count',
      priority: 3,
      currentRange: { min: dailyCount, max: dailyCount },
      suggestion: 'variety',
      reason: "You rely on one daily trainer - rotating between different dailies reduces overuse and adds variety.",
      recommendedArchetype: 'daily_trainer'
    });
  }

  // Priority 4: Drop variety (all drops within 4mm)
  if (hasLowDropVariety(currentShoes, catalogue)) {
    const dropRec = getDropVarietyRecommendation(currentShoes, catalogue);
    gaps.push({
      dimension: 'drop',
      priority: 4,
      currentRange: { min: Math.min(...drops), max: Math.max(...drops) },
      suggestion: Math.max(...drops) >= 6 ? 'low' : 'high',
      reason: dropRec.reason,
      recommendedArchetype: 'daily_trainer',
      dropSuggestion: dropRec.suggestion
    });
  }

  // Priority 5: Stability gap (conditional - only if profile suggests need)
  if (stabilityMax <= 2 && shouldRecommendStability(currentShoes, profile)) {
    gaps.push({
      dimension: 'stability',
      priority: 5,
      currentRange: { min: Math.min(...stabilities), max: stabilityMax },
      suggestion: 'high',
      reason: "A more stable shoe could provide better support and reduce injury risk.",
      recommendedArchetype: 'daily_trainer'
    });
  }

  // Sort by priority
  gaps.sort((a, b) => a.priority - b.priority);

  console.log('[detectAdvancedPriorities] Gaps found:', gaps.map(g => `${g.dimension} (p${g.priority})`));

  return gaps;
}

/**
 * Detect feel gaps in the current rotation
 * Routes to beginner or advanced priorities based on experience level
 *
 * Beginner/Injury-comeback: Max Cushion → Stability → Different Daily → Drop Variety
 * Intermediate/Advanced: Max Cushion → Bounce → Different Daily → Drop Variety → Stability
 */
function detectFeelGaps(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  profile?: RunnerProfile
): FeelGap[] {
  const shoes = resolveShoes(currentShoes, catalogue);
  if (shoes.length === 0) return [];

  console.log('[detectFeelGaps] Starting feel gap detection', {
    shoeCount: shoes.length,
    experience: profile?.experience,
    primaryGoal: profile?.primaryGoal
  });

  // Route based on experience level
  if (profile && isBeginnerOrInjuryComeback(profile)) {
    console.log('[detectFeelGaps] Using beginner priorities');
    return detectBeginnerPriorities(currentShoes, catalogue, profile);
  } else {
    // Default to advanced priorities if no profile or intermediate/experienced/competitive
    console.log('[detectFeelGaps] Using advanced priorities');
    // Create a default profile for the function call if none provided
    const effectiveProfile = profile || {
      firstName: '',
      experience: 'intermediate' as const,
      primaryGoal: 'general_fitness' as const
    };
    return detectAdvancedPriorities(currentShoes, catalogue, effectiveProfile);
  }
}

/**
 * Convert internal FeelGap to FeelGapInfo for API response
 * Note: 'daily_count' dimension doesn't have a direct feel mapping,
 * so we use a contrast-based approach instead (handled separately)
 */
function toFeelGapInfo(gap: FeelGap): FeelGapInfo | null {
  // daily_count doesn't map to a feel dimension - use contrast-based approach instead
  if (gap.dimension === 'daily_count') {
    return null;
  }

  // Map dimension and suggestion to target values
  let targetValue: number;
  // Type-safe dimension mapping (exclude 'daily_count' which returns null above)
  const feelDimension = gap.dimension as 'cushion' | 'drop' | 'rocker' | 'stability' | 'bounce';

  switch (gap.dimension) {
    case 'cushion':
      targetValue = gap.suggestion === 'high' ? 5 : 1;
      break;
    case 'bounce':
      targetValue = gap.suggestion === 'high' ? 5 : 2;
      break;
    case 'rocker':
      targetValue = gap.suggestion === 'high' ? 5 : 2;
      break;
    case 'stability':
      targetValue = gap.suggestion === 'high' ? 4 : 1;
      break;
    case 'drop':
      // For drop, we use mm values that will be mapped to buckets
      // low drop = 0-4mm, high drop = 8-10mm
      targetValue = gap.suggestion === 'low' ? 4 : 10;
      break;
    default:
      targetValue = 3;
  }

  return {
    dimension: feelDimension,
    suggestion: gap.suggestion === 'variety' ? 'high' : gap.suggestion,
    targetValue
  };
}

// ============================================================================
// REASON STRINGS
// ============================================================================

const TIER_1_REASONS: Record<ShoeArchetype, string> = {
  "workout_shoe": "You're doing speed work but don't have a responsive shoe for workouts.",
  "race_shoe": "You're training for races but don't have a dedicated race day shoe.",
  "daily_trainer": "You need a versatile daily trainer to anchor your rotation.",
  "recovery_shoe": "Your training load needs a protective shoe for easy days.",
  "trail_shoe": "You're running trails but don't have trail-specific shoes.",
};

// Load resilience specific reasons
const LOAD_RESILIENCE_REASONS = {
  need_load_sharing: "At your weekly volume, one shoe is taking too much punishment. Adding another daily trainer would spread the load and reduce injury risk.",
};

const TIER_2_REASONS = {
  no_plates: "A plated shoe could help you get more from your speed sessions.",
  low_variety: "Your shoes are similar in feel - adding variety could reduce injury risk.",
  volume_spread: "At your volume, another rotation shoe would help spread the load.",
  redundancy: "You have similar shoes - swapping one would add versatility.",
};

const TIER_3_REASONS = {
  zero_drop: "Trying a low-drop shoe works different muscles and adds variety.",
  high_rocker: "A rocker shoe could give your joints a break with a different gait.",
  max_cushion: "A max-cushion shoe is great for easy days and trying something different.",
  firm_option: "A firmer shoe strengthens feet and adds feel variety.",
  // Complete rotation reasons
  complete_rotation: "Your rotation covers all your training needs. If you're looking for variety, a shoe with a different feel could be a fun experiment.",
  complete_low_variety: "Your rotation is solid. If you want to explore, a shoe with contrasting cushion or drop could be interesting.",
};

// ============================================================================
// ARCHETYPE PRIORITY FOR TIER 1
// ============================================================================

/**
 * Get priority-ordered archetypes for Tier 1 based on profile
 */
function getPriorityArchetypes(profile: RunnerProfile): ShoeArchetype[] {
  const priority: ShoeArchetype[] = [];

  // Workout shoe is high priority for speed goals
  if (profile.primaryGoal === "race_training" || profile.primaryGoal === "get_faster") {
    priority.push("workout_shoe");
  }

  // Race shoe for race training
  if (profile.primaryGoal === "race_training") {
    priority.push("race_shoe");
  }

  // Daily trainer is always high priority if missing
  priority.push("daily_trainer");

  // Recovery for structured training or injury comeback
  if (profile.runningPattern === "structured_training" || profile.primaryGoal === "injury_comeback") {
    priority.push("recovery_shoe");
  }

  // Trail if they run trails
  if (profile.trailRunning === "most_or_all") {
    priority.push("trail_shoe");
  }

  return priority;
}

// ============================================================================
// SHARED TIER 3 BUILDER
// ============================================================================

/**
 * Build a Tier 3 (exploration) classification from feel gaps and contrast profile.
 * Used by both the "complete rotation" fast-path and the regular Tier 3 fallback.
 */
function buildTier3Classification(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[],
  profile: RunnerProfile,
  analysis: RotationAnalysis,
  tierReasonPrefix: string,
  noGapMessage: string
): TierClassification {
  const feelGaps = detectFeelGaps(currentShoes, catalogue, profile);
  const contrastProfile = buildContrastProfile(currentShoes, catalogue);

  let primary: RecommendationSlot;
  let secondary: RecommendationSlot | undefined;

  if (feelGaps.length > 0) {
    const primaryGap = feelGaps[0];

    let archetype = primaryGap.recommendedArchetype;
    let reason = primaryGap.reason;

    if (analysis.coveredArchetypes.includes(archetype)) {
      reason = `Your rotation could use more feel variety. ${primaryGap.reason}`;
    }

    const feelGapInfo = toFeelGapInfo(primaryGap);

    primary = {
      archetype,
      reason,
      feelGap: feelGapInfo || undefined,
      contrastWith: contrastProfile
    };

    if (feelGaps.length > 1) {
      const secondaryGap = feelGaps[1];
      const secondaryFeelGapInfo = toFeelGapInfo(secondaryGap);
      secondary = {
        archetype: secondaryGap.recommendedArchetype,
        reason: secondaryGap.reason,
        feelGap: secondaryFeelGapInfo || undefined,
        contrastWith: contrastProfile
      };
    }
  } else {
    primary = {
      archetype: "daily_trainer",
      reason: noGapMessage,
      contrastWith: contrastProfile
    };
    secondary = undefined;
  }

  // Beginners only get one practical recommendation
  if (profile.experience === 'beginner') {
    secondary = undefined;
    if (primary.archetype === 'recovery_shoe' && currentShoes.length <= 1) {
      const dailyCount = getDailyTrainerCount(currentShoes, catalogue);
      primary = {
        archetype: 'daily_trainer',
        reason: getDailyTrainerReasonText(dailyCount, 'variety'),
        feelGap: primary.feelGap,
        contrastWith: contrastProfile
      };
    }
  }

  const feelGapNames = feelGaps.length > 0
    ? feelGaps.map(g => g.dimension).join(", ")
    : "none";

  const result: TierClassification = {
    tier: 3,
    confidence: "soft",
    primary,
    secondary,
    tierReason: `${tierReasonPrefix}Feel gaps: ${feelGapNames}`,
  };

  console.log('[classifyRotationTier] Result:', {
    tier: result.tier,
    confidence: result.confidence,
    primary: result.primary.archetype,
    secondary: result.secondary?.archetype,
    feelGaps: feelGapNames
  });

  return result;
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Classify rotation into tiers and determine recommendation slots
 */
export function classifyRotationTier(
  health: RotationHealth,
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): TierClassification {
  console.log('[classifyRotationTier] Input:', {
    healthOverall: health.overall,
    healthCoverage: health.coverage,
    healthGoalAlignment: health.goalAlignment,
    healthLoadResilience: health.loadResilience,
    healthVariety: health.variety,
    missingArchetypes: analysis.missingArchetypes,
    profileGoal: profile.primaryGoal,
  });

  // =========================================================================
  // TIER 1: GENUINE GAPS
  // =========================================================================

  // Check health thresholds
  const hasCoverageGap = health.coverage < 70;
  const hasGoalAlignmentGap = health.goalAlignment < 50;
  const hasLoadResilienceGap = health.loadResilience < 70; // Changed from 50 to catch more cases

  // Check for critical missing archetypes (user's suggested addition)
  const criticalArchetypes = getCriticalArchetypes(profile);
  const missingCritical = criticalArchetypes.filter(
    a => analysis.missingArchetypes.includes(a)
  );
  const hasCriticalMissing = missingCritical.length > 0;

  // Tier 1 triggers
  const isTier1 = hasCoverageGap || hasGoalAlignmentGap || hasLoadResilienceGap || hasCriticalMissing;

  // Check if this is a high-volume load resilience issue
  const volumeKm = getVolumeKm(profile);
  const isHighVolumeLoadIssue = hasLoadResilienceGap && volumeKm >= 50;

  if (isHighVolumeLoadIssue) {
    console.log('[classifyRotationTier] Load resilience issue:', {
      loadResilience: health.loadResilience,
      weeklyVolume: profile.weeklyVolume,
      shoeCount: currentShoes.length
    });
  }

  if (isTier1) {
    // Determine primary gap using priority order
    const priorityOrder = getPriorityArchetypes(profile);
    const missing = analysis.missingArchetypes;

    let primaryArchetype: ShoeArchetype | undefined;
    let primaryReason: string | undefined;

    // Special handling for high-volume load resilience issues
    // Load sharing takes priority over performance shoes
    if (isHighVolumeLoadIssue && currentShoes.length < 3) {
      // Check if they have a daily trainer
      const hasDailyTrainer = analysis.coveredArchetypes.includes("daily_trainer");
      const dailyCount = getDailyTrainerCount(currentShoes, catalogue);

      if (!hasDailyTrainer) {
        // No daily trainer - recommend one
        primaryArchetype = "daily_trainer";
        primaryReason = TIER_1_REASONS["daily_trainer"];
      } else if (currentShoes.length === 1) {
        // Only one shoe - recommend another daily trainer for load sharing
        primaryArchetype = "daily_trainer";
        primaryReason = LOAD_RESILIENCE_REASONS.need_load_sharing;
      } else {
        // 2 shoes but still load issue - recommend daily trainer
        primaryArchetype = "daily_trainer";
        // Use dynamic text based on actual daily trainer count
        primaryReason = `You're running high mileage on a small rotation. ${getDailyTrainerReasonText(dailyCount, 'load_sharing')}`;
      }
    }

    // If not a load issue or load issue handled, use normal priority
    if (!primaryArchetype) {
      // Find highest priority missing archetype
      for (const archetype of priorityOrder) {
        if (missing.includes(archetype)) {
          primaryArchetype = archetype;
          break;
        }
      }

      // Fallback to first missing if none in priority
      if (!primaryArchetype && missing.length > 0) {
        primaryArchetype = missing[0];
      }

      // If still no archetype, use goal-based default
      if (!primaryArchetype) {
        primaryArchetype = profile.primaryGoal === "race_training" ? "workout_shoe" :
                           profile.primaryGoal === "get_faster" ? "workout_shoe" :
                           profile.primaryGoal === "injury_comeback" ? "recovery_shoe" :
                           "daily_trainer";
      }
    }

    const primary: RecommendationSlot = {
      archetype: primaryArchetype,
      reason: primaryReason || TIER_1_REASONS[primaryArchetype],
    };

    // Find secondary gap (different from primary)
    let secondary: RecommendationSlot | undefined;

    // For high-volume load issues, secondary should be a performance shoe based on goal
    if (isHighVolumeLoadIssue && primaryArchetype === "daily_trainer") {
      // Suggest a performance shoe as secondary based on goal
      if (profile.primaryGoal === "race_training") {
        if (!analysis.coveredArchetypes.includes("race_shoe")) {
          secondary = { archetype: "race_shoe", reason: TIER_1_REASONS["race_shoe"] };
        } else if (!analysis.coveredArchetypes.includes("workout_shoe")) {
          secondary = { archetype: "workout_shoe", reason: TIER_1_REASONS["workout_shoe"] };
        }
      } else if (profile.primaryGoal === "get_faster") {
        if (!analysis.coveredArchetypes.includes("workout_shoe")) {
          secondary = { archetype: "workout_shoe", reason: TIER_1_REASONS["workout_shoe"] };
        }
      }
    }

    // If no secondary yet, find from priority order
    if (!secondary) {
      for (const archetype of priorityOrder) {
        if (missing.includes(archetype) && archetype !== primaryArchetype) {
          secondary = {
            archetype,
            reason: TIER_1_REASONS[archetype],
          };
          break;
        }
      }
    }

    // Build tier reason
    const triggers: string[] = [];
    if (hasCoverageGap) triggers.push("coverage gap");
    if (hasGoalAlignmentGap) triggers.push("goal misalignment");
    if (hasLoadResilienceGap) triggers.push("load resilience issue");
    if (hasCriticalMissing) triggers.push(`missing critical: ${missingCritical.join(", ")}`);

    const result: TierClassification = {
      tier: 1,
      confidence: "high",
      primary,
      secondary,
      tierReason: `Tier 1: ${triggers.join(", ")}`,
    };

    console.log('[classifyRotationTier] Result:', {
      tier: result.tier,
      confidence: result.confidence,
      primary: result.primary.archetype,
      secondary: result.secondary?.archetype,
    });

    return result;
  }

  // =========================================================================
  // CHECK FOR COMPLETE ROTATION - Skip Tier 2 if rotation is complete
  // =========================================================================

  // A complete rotation should go straight to Tier 3 exploration
  const isCompleteRotation =
    health.coverage === 100 &&
    health.loadResilience >= 70 &&
    analysis.missingArchetypes.length === 0;

  if (isCompleteRotation) {
    console.log('[classifyRotationTier] Complete rotation detected:', {
      coverage: health.coverage,
      loadResilience: health.loadResilience,
      variety: health.variety,
      downgradingToTier3: true
    });

    return buildTier3Classification(
      currentShoes, catalogue, profile, analysis,
      "Tier 3: Complete rotation. ",
      "Your rotation has great coverage and variety. If you ever want to experiment, a new daily trainer is always a safe way to try something different."
    );
  }

  // =========================================================================
  // TIER 2: ROTATION IMPROVEMENTS
  // =========================================================================

  const tier2Triggers: Array<{ archetype: ShoeArchetype; reason: string; triggerName: string }> = [];

  // Check 1: No plated option (intermediate+ who does workouts)
  const experienceLevel = profile.experience;
  const isIntermediate = experienceLevel === "intermediate" ||
                         experienceLevel === "experienced" ||
                         experienceLevel === "competitive";

  if (isIntermediate && doesWorkouts(profile) && !hasPlatedShoe(currentShoes, catalogue)) {
    tier2Triggers.push({
      archetype: "workout_shoe",
      reason: TIER_2_REASONS.no_plates,
      triggerName: "no_plates",
    });
  }

  // Check 2: Low variety (only for incomplete rotations - complete rotations handled above)
  if (health.variety < 30 && currentShoes.length > 1) {
    // Recommend archetype that adds variety - check what's clustered
    const cushionRange = getCushionRange(currentShoes, catalogue);
    const rockerRange = getRockerRange(currentShoes, catalogue);

    // If all soft, suggest something firmer (workout shoe)
    // If all firm, suggest something softer (recovery shoe)
    if (cushionRange.min >= 3 && cushionRange.max <= 4) {
      tier2Triggers.push({
        archetype: "workout_shoe",
        reason: TIER_2_REASONS.low_variety,
        triggerName: "low_variety",
      });
    } else if (cushionRange.min <= 2 && cushionRange.max <= 3) {
      tier2Triggers.push({
        archetype: "recovery_shoe",
        reason: TIER_2_REASONS.low_variety,
        triggerName: "low_variety",
      });
    } else if (rockerRange.max < 3) {
      tier2Triggers.push({
        archetype: "daily_trainer",
        reason: TIER_2_REASONS.low_variety,
        triggerName: "low_variety",
      });
    }
  }

  // Check 3: Volume spread (70+ km/week and fewer than 3 shoes)
  // volumeKm already calculated above in Tier 1 section
  if (volumeKm >= 70 && currentShoes.length < 3) {
    tier2Triggers.push({
      archetype: "daily_trainer",
      reason: TIER_2_REASONS.volume_spread,
      triggerName: "volume_spread",
    });
  }

  // Check 4: Redundancy with missing archetypes
  if (analysis.redundancies.length > 0 && analysis.missingArchetypes.length > 0) {
    tier2Triggers.push({
      archetype: analysis.missingArchetypes[0],
      reason: TIER_2_REASONS.redundancy,
      triggerName: "redundancy",
    });
  }

  if (tier2Triggers.length > 0) {
    const primary: RecommendationSlot = {
      archetype: tier2Triggers[0].archetype,
      reason: tier2Triggers[0].reason,
    };

    let secondary: RecommendationSlot | undefined;
    if (tier2Triggers.length > 1 && tier2Triggers[1].archetype !== tier2Triggers[0].archetype) {
      secondary = {
        archetype: tier2Triggers[1].archetype,
        reason: tier2Triggers[1].reason,
      };
    }

    const triggerNames = tier2Triggers.map(t => t.triggerName).join(", ");

    const result: TierClassification = {
      tier: 2,
      confidence: "medium",
      primary,
      secondary,
      tierReason: `Tier 2: ${triggerNames}`,
    };

    console.log('[classifyRotationTier] Result:', {
      tier: result.tier,
      confidence: result.confidence,
      primary: result.primary.archetype,
      secondary: result.secondary?.archetype,
    });

    return result;
  }

  // =========================================================================
  // TIER 3: EXPLORATION (based on feel gaps)
  // =========================================================================

  console.log('[classifyRotationTier] Tier 3 - analyzing feel gaps');

  return buildTier3Classification(
    currentShoes, catalogue, profile, analysis,
    "Tier 3: ",
    "Your rotation is solid and varied. If you want to experiment, a new daily trainer is always a safe way to try something different."
  );
}
