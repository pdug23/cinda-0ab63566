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

  // Check 2: Low variety
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
  const volumeKm = getVolumeKm(profile);
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
  // TIER 3: EXPLORATION
  // =========================================================================

  const tier3Triggers: Array<{ archetype: ShoeArchetype; reason: string; triggerName: string }> = [];

  const dropRange = getDropRange(currentShoes, catalogue);
  const cushionRange = getCushionRange(currentShoes, catalogue);
  const rockerRange = getRockerRange(currentShoes, catalogue);

  // Check 1: No zero/low drop (all shoes >= 5mm)
  if (dropRange.min > 4) {
    tier3Triggers.push({
      archetype: "workout_shoe", // Low drop often found in workout/race shoes
      reason: TIER_3_REASONS.zero_drop,
      triggerName: "zero_drop",
    });
  }

  // Check 2: No high rocker (all shoes < 4 rocker)
  if (rockerRange.max < 4) {
    tier3Triggers.push({
      archetype: "daily_trainer", // Many rocker shoes are daily trainers
      reason: TIER_3_REASONS.high_rocker,
      triggerName: "high_rocker",
    });
  }

  // Check 3: No max cushion (no shoe with cushion === 5)
  if (cushionRange.max < 5) {
    tier3Triggers.push({
      archetype: "recovery_shoe",
      reason: TIER_3_REASONS.max_cushion,
      triggerName: "max_cushion",
    });
  }

  // Check 4: No firm/fast option (no shoe with cushion <= 2)
  if (cushionRange.min > 2) {
    tier3Triggers.push({
      archetype: "race_shoe",
      reason: TIER_3_REASONS.firm_option,
      triggerName: "firm_option",
    });
  }

  // Build Tier 3 result
  let primary: RecommendationSlot;
  let secondary: RecommendationSlot | undefined;

  if (tier3Triggers.length > 0) {
    primary = {
      archetype: tier3Triggers[0].archetype,
      reason: tier3Triggers[0].reason,
    };

    if (tier3Triggers.length > 1 && tier3Triggers[1].archetype !== tier3Triggers[0].archetype) {
      secondary = {
        archetype: tier3Triggers[1].archetype,
        reason: tier3Triggers[1].reason,
      };
    }
  } else {
    // Default Tier 3: suggest exploration based on what they don't have
    // If they have everything, suggest a daily trainer for variety
    primary = {
      archetype: "daily_trainer",
      reason: "Your rotation is solid. A new daily trainer could add fresh variety.",
    };
  }

  const triggerNames = tier3Triggers.length > 0
    ? tier3Triggers.map(t => t.triggerName).join(", ")
    : "complete rotation";

  const result: TierClassification = {
    tier: 3,
    confidence: "soft",
    primary,
    secondary,
    tierReason: `Tier 3: ${triggerNames}`,
  };

  console.log('[classifyRotationTier] Result:', {
    tier: result.tier,
    confidence: result.confidence,
    primary: result.primary.archetype,
    secondary: result.secondary?.archetype,
  });

  return result;
}
