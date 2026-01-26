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
} from '../types.js';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve CurrentShoe[] to Shoe[] from catalogue
 */
function resolveShoes(currentShoes: CurrentShoe[], catalogue: Shoe[]): Shoe[] {
  const resolved: Shoe[] = [];
  for (const userShoe of currentShoes) {
    const shoe = catalogue.find(s => s.shoe_id === userShoe.shoeId);
    if (shoe) resolved.push(shoe);
  }
  return resolved;
}

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
// FEEL GAP DETECTION
// ============================================================================

/**
 * Describes a gap in feel variety that could be explored
 */
interface FeelGap {
  dimension: 'drop' | 'cushion' | 'rocker' | 'stability';
  priority: number;  // Lower = more important (1 = highest priority)
  currentRange: { min: number; max: number };
  suggestion: 'low' | 'high';  // Which end to explore
  reason: string;
  recommendedArchetype: ShoeArchetype;
}

/**
 * Detect feel gaps in the current rotation
 * Returns ordered list of feel dimensions that could use more variety
 * Priority: max cushion > high rocker > stability > drop
 */
function detectFeelGaps(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): FeelGap[] {
  const shoes = resolveShoes(currentShoes, catalogue);

  if (shoes.length === 0) return [];

  const shoeCount = shoes.length;

  // Calculate values for each dimension
  const drops = shoes.map(s => s.heel_drop_mm);
  const cushions = shoes.map(s => s.cushion_softness_1to5);
  const rockers = shoes.map(s => s.rocker_1to5);
  const stabilities = shoes.map(s => s.stability_1to5);

  console.log('[detectFeelGaps] Feel dimensions:', {
    shoeCount,
    drops,
    cushions,
    rockers,
    stabilities
  });

  const gaps: FeelGap[] = [];

  // Calculate ranges
  const dropMin = Math.min(...drops);
  const dropMax = Math.max(...drops);
  const cushionMax = Math.max(...cushions);
  const rockerMax = Math.max(...rockers);
  const stabilityMax = Math.max(...stabilities);

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

  // Priority 2: High rocker gap (no shoe has rocker 4+)
  if (rockerMax < 4) {
    gaps.push({
      dimension: 'rocker',
      priority: 2,
      currentRange: { min: Math.min(...rockers), max: rockerMax },
      suggestion: 'high',
      reason: shoeCount === 1
        ? "Your shoe doesn't have much rocker. A shoe with an aggressive rocker could ease joint stress and offer a different ride."
        : "None of your shoes have an aggressive rocker. A shoe with an aggressive rocker could ease joint stress and offer a different ride.",
      recommendedArchetype: 'daily_trainer'
    });
  }

  // Priority 3: Stability gap (all shoes neutral, stability ≤ 2)
  if (stabilityMax <= 2) {
    gaps.push({
      dimension: 'stability',
      priority: 3,
      currentRange: { min: Math.min(...stabilities), max: stabilityMax },
      suggestion: 'high',
      reason: shoeCount === 1
        ? "Your shoe is neutral. A light stability option could offer support on tired days."
        : "Your rotation is all neutral. A light stability shoe could offer support on tired days.",
      recommendedArchetype: 'daily_trainer'
    });
  }

  // Priority 4: Drop gap (check both directions)
  if (dropMin > 5) {
    // All shoes are mid-to-high drop, suggest low drop
    gaps.push({
      dimension: 'drop',
      priority: 4,
      currentRange: { min: dropMin, max: dropMax },
      suggestion: 'low',
      reason: shoeCount === 1
        ? "Your shoe is higher drop. A low-drop option could strengthen different muscles and add variety."
        : "All your shoes are 6mm+ drop. A low-drop shoe could strengthen different muscles and add variety.",
      recommendedArchetype: 'daily_trainer'
    });
  } else if (dropMax < 6) {
    // All shoes are low drop, suggest higher drop
    gaps.push({
      dimension: 'drop',
      priority: 4,
      currentRange: { min: dropMin, max: dropMax },
      suggestion: 'high',
      reason: shoeCount === 1
        ? "Your shoe is low drop. A traditional drop shoe could give your calves a break."
        : "Your rotation is low-drop focused. A traditional drop shoe could give your calves a break.",
      recommendedArchetype: 'daily_trainer'
    });
  }

  // Sort by priority before returning
  gaps.sort((a, b) => a.priority - b.priority);

  console.log('[detectFeelGaps] Gaps found (sorted by priority):', gaps.map(g => `${g.dimension} (p${g.priority})`));

  return gaps;
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
  high_volume_small_rotation: "You're running high mileage on a small rotation. A second daily trainer would help protect your legs and extend the life of your shoes.",
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
        primaryReason = LOAD_RESILIENCE_REASONS.high_volume_small_rotation;
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

    // Skip Tier 2, go straight to Tier 3 exploration
    // Use feel-based gap detection for recommendations
    console.log('[classifyRotationTier] Complete rotation - analyzing feel gaps');
    const feelGaps = detectFeelGaps(currentShoes, catalogue);

    // Build Tier 3 result based on feel gaps
    let primary: RecommendationSlot;
    let secondary: RecommendationSlot | undefined;

    if (feelGaps.length > 0) {
      // Primary = first feel gap (most significant)
      const primaryGap = feelGaps[0];

      // Check if they already have this archetype covered
      let archetype = primaryGap.recommendedArchetype;
      let reason = primaryGap.reason;

      if (analysis.coveredArchetypes.includes(archetype)) {
        // Adjust reason to clarify it's about feel variety within the archetype
        reason = `Your rotation could use more feel variety. ${primaryGap.reason}`;
      }

      primary = { archetype, reason };

      // Secondary = second feel gap if exists and different dimension
      if (feelGaps.length > 1) {
        const secondaryGap = feelGaps[1];
        secondary = {
          archetype: secondaryGap.recommendedArchetype,
          reason: secondaryGap.reason
        };
      }
    } else {
      // No feel gaps detected - rotation has great variety
      // Give a soft "you're all set" with optional exploration
      primary = {
        archetype: "daily_trainer",
        reason: "Your rotation has great coverage and variety. If you ever want to experiment, a new daily trainer is always a safe way to try something different."
      };
      secondary = undefined;
    }

    // Beginners only get one practical recommendation
    if (profile.experience === 'beginner') {
      secondary = undefined;
      // Swap recovery_shoe to daily_trainer for beginners - more practical
      if (primary.archetype === 'recovery_shoe') {
        primary = {
          archetype: 'daily_trainer',
          reason: "A second daily trainer with a different feel could add variety and share the load."
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
      tierReason: `Tier 3: Complete rotation. Feel gaps: ${feelGapNames}`,
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
  const feelGaps = detectFeelGaps(currentShoes, catalogue);

  // Build Tier 3 result based on feel gaps
  let primary: RecommendationSlot;
  let secondary: RecommendationSlot | undefined;

  if (feelGaps.length > 0) {
    // Primary = first feel gap (most significant)
    const primaryGap = feelGaps[0];

    // Check if they already have this archetype covered
    let archetype = primaryGap.recommendedArchetype;
    let reason = primaryGap.reason;

    if (analysis.coveredArchetypes.includes(archetype)) {
      // Adjust reason to clarify it's about feel variety
      reason = `Your rotation could use more feel variety. ${primaryGap.reason}`;
    }

    primary = { archetype, reason };

    // Secondary = second feel gap if exists
    if (feelGaps.length > 1) {
      const secondaryGap = feelGaps[1];
      secondary = {
        archetype: secondaryGap.recommendedArchetype,
        reason: secondaryGap.reason
      };
    }
  } else {
    // No feel gaps detected - rotation has great variety
    primary = {
      archetype: "daily_trainer",
      reason: "Your rotation is solid and varied. If you want to experiment, a new daily trainer is always a safe way to try something different."
    };
    secondary = undefined;
  }

  // Beginners only get one practical recommendation
  if (profile.experience === 'beginner') {
    secondary = undefined;
    // Swap recovery_shoe to daily_trainer for beginners - more practical
    if (primary.archetype === 'recovery_shoe') {
      primary = {
        archetype: 'daily_trainer',
        reason: "A second daily trainer with a different feel could add variety and share the load."
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
    tierReason: `Tier 3: Feel gaps: ${feelGapNames}`,
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
