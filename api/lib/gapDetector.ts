// ============================================================================
// GAP DETECTION LOGIC
// Identifies the single most important gap in a runner's shoe rotation
// Updated for run type -> archetype mapping model
// ============================================================================

import type {
  Gap,
  GapType,
  GapSeverity,
  RotationAnalysis,
  RunnerProfile,
  CurrentShoe,
  Shoe,
  RunType,
  ShoeArchetype
} from '../types.js';
import {
  RUN_TYPE_MAPPING,
  shoeHasArchetype,
  shoeIsSuitableFor
} from '../types.js';

// ============================================================================
// GAP MESSAGES
// ============================================================================

const GAP_MESSAGES: Record<RunType, string> = {
  "all_runs": "You need a versatile daily trainer to handle your regular mileage.",
  "recovery": "A dedicated recovery shoe could help protect your legs on easy days.",
  "long_runs": "Your long runs would benefit from a cushioned daily trainer or recovery shoe.",
  "workouts": "You're doing speed work - a workout shoe would help you get more from those sessions.",
  "races": "A race shoe could give you an edge on race day.",
  "trail": "You need trail shoes for off-road running."
};

// ============================================================================
// COVERAGE GAP DETECTION
// ============================================================================

/**
 * Detect gaps based on run type -> archetype mapping
 * For each run type the user does, check if they have a shoe with suitable archetype
 */
function detectCoverageGaps(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Array<{ runType: RunType; recommendedArchetype: ShoeArchetype; priority: number }> {
  const gaps: Array<{ runType: RunType; recommendedArchetype: ShoeArchetype; priority: number }> = [];

  // Collect all run types user does
  const allRunTypes = new Set<RunType>();
  for (const userShoe of currentShoes) {
    if (userShoe.runTypes) {
      userShoe.runTypes.forEach(rt => allRunTypes.add(rt));
    }
  }

  // Priority order for run types
  const runTypePriority: Record<RunType, number> = {
    "all_runs": 1,
    "workouts": 2,
    "races": 3,
    "long_runs": 4,
    "recovery": 5,
    "trail": 6
  };

  // For each run type, check if user has suitable archetype
  for (const runType of allRunTypes) {
    const suitableArchetypes = RUN_TYPE_MAPPING[runType];

    const hasSuitable = currentShoes.some(userShoe => {
      const shoe = catalogue.find(s => s.shoe_id === userShoe.shoeId);
      if (!shoe) return false;
      return suitableArchetypes.some(archetype => shoeHasArchetype(shoe, archetype));
    });

    if (!hasSuitable) {
      gaps.push({
        runType,
        recommendedArchetype: suitableArchetypes[0], // First archetype is preferred
        priority: runTypePriority[runType] || 10
      });
    }
  }

  // Sort by priority (lower number = higher priority)
  gaps.sort((a, b) => a.priority - b.priority);

  return gaps;
}

/**
 * Check if there's a coverage gap (missing archetype for a run type)
 * Coverage gaps are HIGHEST PRIORITY
 */
function checkCoverageGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  const gaps = detectCoverageGaps(currentShoes, catalogue);

  if (gaps.length === 0) {
    return null; // No coverage gaps
  }

  // Take the highest priority gap
  const primaryGap = gaps[0];

  // Determine severity based on profile
  let severity: GapSeverity = "medium";

  // High severity conditions
  if (primaryGap.runType === "all_runs" && currentShoes.length === 0) {
    severity = "high";
  } else if (primaryGap.runType === "workouts" &&
    (profile.primaryGoal === "get_faster" || profile.primaryGoal === "race_training")) {
    severity = "high";
  } else if (primaryGap.runType === "races" && profile.primaryGoal === "race_training") {
    severity = "high";
  } else if (primaryGap.runType === "trail" && profile.trailRunning === "most_or_all") {
    severity = "high";
  }

  return {
    type: "coverage",
    severity,
    reasoning: GAP_MESSAGES[primaryGap.runType],
    runType: primaryGap.runType,
    recommendedArchetype: primaryGap.recommendedArchetype,
  };
}

// ============================================================================
// MISUSE DETECTION
// ============================================================================

interface MisuseInfo {
  shoeId: string;
  shoeName: string;
  runType: RunType;
  message: string;
}

/**
 * Detect misuse: using a shoe for runs it's not designed for
 */
function detectMisuse(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): MisuseInfo[] {
  const misuses: MisuseInfo[] = [];

  for (const userShoe of currentShoes) {
    const shoe = catalogue.find(s => s.shoe_id === userShoe.shoeId);
    if (!shoe) continue;

    for (const runType of userShoe.runTypes || []) {
      // Race shoe for recovery or all_runs
      if (shoeHasArchetype(shoe, 'race_shoe') &&
        !shoeHasArchetype(shoe, 'daily_trainer') &&
        (runType === 'recovery' || runType === 'all_runs')) {
        misuses.push({
          shoeId: shoe.shoe_id,
          shoeName: shoe.full_name,
          runType,
          message: `Your ${shoe.full_name} is a race weapon - using it for ${runType === 'all_runs' ? 'all your runs' : 'easy runs'} wears it out without benefit.`
        });
      }

      // Recovery shoe for workouts or races
      if (shoeHasArchetype(shoe, 'recovery_shoe') &&
        !shoeHasArchetype(shoe, 'workout_shoe') &&
        !shoeHasArchetype(shoe, 'race_shoe') &&
        (runType === 'workouts' || runType === 'races')) {
        misuses.push({
          shoeId: shoe.shoe_id,
          shoeName: shoe.full_name,
          runType,
          message: `Your ${shoe.full_name} is built for easy days. It'll feel ${runType === 'races' ? 'slow on race day' : 'sluggish during speed work'}.`
        });
      }
    }
  }

  return misuses;
}

/**
 * Check if there's a misuse gap (using shoes incorrectly)
 */
function checkMisuseGap(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  const misuses = detectMisuse(currentShoes, catalogue);

  if (misuses.length === 0) {
    return null;
  }

  // Take the first misuse
  const primaryMisuse = misuses[0];

  // Determine what archetype they need
  let recommendedArchetype: ShoeArchetype = 'daily_trainer';
  if (primaryMisuse.runType === 'workouts') {
    recommendedArchetype = 'workout_shoe';
  } else if (primaryMisuse.runType === 'races') {
    recommendedArchetype = 'race_shoe';
  } else if (primaryMisuse.runType === 'recovery') {
    recommendedArchetype = 'daily_trainer';
  }

  return {
    type: "misuse",
    severity: "high",
    reasoning: primaryMisuse.message,
    runType: primaryMisuse.runType,
    recommendedArchetype
  };
}

// ============================================================================
// PERFORMANCE GAP DETECTION
// ============================================================================

/**
 * Check if there's a performance gap (needs faster shoes)
 */
function checkPerformanceGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  // Only check performance if goal is pace/racing oriented
  const isPerformanceFocused =
    profile.primaryGoal === "get_faster" ||
    profile.primaryGoal === "race_training" ||
    profile.experience === "competitive";

  if (!isPerformanceFocused) {
    return null;
  }

  // Check if they have workout or race shoe coverage
  const hasWorkoutShoe = currentShoes.some(us => {
    const shoe = catalogue.find(s => s.shoe_id === us.shoeId);
    return shoe && shoeHasArchetype(shoe, 'workout_shoe');
  });

  const hasRaceShoe = currentShoes.some(us => {
    const shoe = catalogue.find(s => s.shoe_id === us.shoeId);
    return shoe && shoeHasArchetype(shoe, 'race_shoe');
  });

  // No fast shoes at all
  if (!hasWorkoutShoe && !hasRaceShoe) {
    return {
      type: "performance",
      severity: "high",
      reasoning: `You're focused on ${profile.primaryGoal === "race_training" ? "racing" : "improving pace"} but your rotation lacks responsive shoes for faster work. A workout shoe would unlock your speed training.`,
      recommendedArchetype: "workout_shoe",
    };
  }

  // Has workout but no race shoes for racing-focused runner
  if (profile.primaryGoal === "race_training" && !hasRaceShoe) {
    return {
      type: "performance",
      severity: "medium",
      reasoning: "You have tempo coverage but could benefit from a carbon-plated race shoe to maximize performance on race day.",
      recommendedArchetype: "race_shoe",
    };
  }

  return null;
}

// ============================================================================
// RECOVERY GAP DETECTION
// ============================================================================

/**
 * Check if there's a recovery gap (needs more cushioning/protection)
 */
function checkRecoveryGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  // Check if recovery is relevant for this runner
  const needsRecovery =
    profile.runningPattern === "structured_training" ||
    profile.runningPattern === "workout_focused" ||
    profile.runningPattern === "mostly_easy" ||
    profile.primaryGoal === "injury_comeback";

  if (!needsRecovery) {
    return null;
  }

  // Check if they have recovery shoe coverage
  const hasRecoveryShoe = currentShoes.some(us => {
    const shoe = catalogue.find(s => s.shoe_id === us.shoeId);
    return shoe && shoeHasArchetype(shoe, 'recovery_shoe');
  });

  // No recovery shoes at all
  if (!hasRecoveryShoe) {
    const severity = (profile.runningPattern === "structured_training" ||
      profile.primaryGoal === "injury_comeback") ? "high" : "medium";

    return {
      type: "recovery",
      severity,
      reasoning: severity === "high"
        ? "Your training volume would benefit from a protective, cushioned shoe for easy days and recovery runs. This will help you absorb the load and stay healthy."
        : "Adding a cushioned recovery shoe would help your legs bounce back between harder efforts.",
      recommendedArchetype: "recovery_shoe",
    };
  }

  return null;
}

// ============================================================================
// REDUNDANCY GAP DETECTION
// ============================================================================

/**
 * Check if there's a redundancy opportunity
 */
function checkRedundancyGap(
  analysis: RotationAnalysis,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  // Need both redundancy and missing archetypes for this to be actionable
  if (analysis.redundancies.length === 0 || analysis.missingArchetypes.length === 0) {
    return null;
  }

  const redundancy = analysis.redundancies[0];
  const missingArchetype = analysis.missingArchetypes[0];

  return {
    type: "redundancy",
    severity: "low",
    reasoning: `You have ${redundancy.shoeIds.length} similar shoes but nothing for ${missingArchetype.replace('_', ' ')}. Swapping one of the similar shoes would add versatility to your rotation.`,
    redundantShoes: redundancy.shoeIds,
    recommendedArchetype: missingArchetype,
  };
}

// ============================================================================
// MAIN GAP IDENTIFICATION FUNCTION
// ============================================================================

/**
 * Identify the single most important gap in the rotation
 * Priority: Misuse > Coverage > Performance > Recovery > Redundancy
 */
export function identifyPrimaryGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap {
  // Edge case: Empty rotation
  if (currentShoes.length === 0) {
    return {
      type: "coverage",
      severity: "high",
      reasoning: "You'd benefit from a versatile daily trainer to start building your rotation. This will be your go-to shoe for most runs.",
      runType: "all_runs",
      recommendedArchetype: "daily_trainer",
    };
  }

  // Calculate volume context (modifier, not blocker)
  let volumeContext: string | null = null;
  let volumeSeverityBoost = false;

  if (profile.weeklyVolume) {
    const volumeKm = profile.weeklyVolume.unit === "mi"
      ? profile.weeklyVolume.value * 1.6
      : profile.weeklyVolume.value;

    const shoeCount = currentShoes.length;

    if (volumeKm >= 50 && shoeCount < 2) {
      volumeContext = `At ${profile.weeklyVolume.value}${profile.weeklyVolume.unit}/week with just one shoe, adding this would also help spread the load and prevent injury.`;
      volumeSeverityBoost = true;
    } else if (volumeKm >= 70 && shoeCount < 3) {
      volumeContext = `With ${profile.weeklyVolume.value}${profile.weeklyVolume.unit}/week, a third shoe would help spread the load across your training.`;
    }
  }

  // Priority 1: Misuse gaps (highest priority)
  const misuseGap = checkMisuseGap(currentShoes, catalogue);
  if (misuseGap) {
    if (volumeContext) {
      misuseGap.reasoning = `${misuseGap.reasoning} ${volumeContext}`;
    }
    return misuseGap;
  }

  // Priority 2: Coverage gaps
  const coverageGap = checkCoverageGap(analysis, profile, currentShoes, catalogue);
  if (coverageGap && coverageGap.severity === "high") {
    if (volumeContext) {
      coverageGap.reasoning = `${coverageGap.reasoning} ${volumeContext}`;
    }
    return coverageGap;
  }

  // Priority 3: Performance gaps (if pace/racing focused)
  const performanceGap = checkPerformanceGap(analysis, profile, currentShoes, catalogue);
  if (performanceGap && performanceGap.severity === "high") {
    if (volumeContext) {
      performanceGap.reasoning = `${performanceGap.reasoning} ${volumeContext}`;
    }
    return performanceGap;
  }

  // Return medium coverage gap
  if (coverageGap && coverageGap.severity === "medium") {
    if (volumeContext) {
      coverageGap.reasoning = `${coverageGap.reasoning} ${volumeContext}`;
      if (volumeSeverityBoost) {
        coverageGap.severity = "high";
      }
    }
    return coverageGap;
  }

  // Priority 4: Recovery gaps
  const recoveryGap = checkRecoveryGap(analysis, profile, currentShoes, catalogue);
  if (recoveryGap) {
    if (volumeContext) {
      recoveryGap.reasoning = `${recoveryGap.reasoning} ${volumeContext}`;
      if (volumeSeverityBoost) {
        recoveryGap.severity = "high";
      }
    }
    return recoveryGap;
  }

  // Priority 5: Performance gap (medium)
  if (performanceGap) {
    if (volumeContext) {
      performanceGap.reasoning = `${performanceGap.reasoning} ${volumeContext}`;
      if (volumeSeverityBoost) {
        performanceGap.severity = "high";
      }
    }
    return performanceGap;
  }

  // Priority 6: Redundancy opportunities (lowest priority)
  const redundancyGap = checkRedundancyGap(analysis, currentShoes, catalogue);
  if (redundancyGap) {
    if (volumeContext) {
      redundancyGap.reasoning = `${redundancyGap.reasoning} ${volumeContext}`;
    }
    return redundancyGap;
  }

  // No gaps found - rotation is well-balanced
  return {
    type: "coverage",
    severity: volumeSeverityBoost ? "high" : "low",
    reasoning: volumeContext
      ? `Your rotation covers the basics well. ${volumeContext}`
      : "Your rotation covers the basics well. Consider adding variety with a different shoe type or feel to expand your options.",
    recommendedArchetype: "daily_trainer",
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if a gap is critical (should be addressed immediately)
 */
export function isGapCritical(gap: Gap): boolean {
  return gap.severity === "high";
}

/**
 * Get a user-friendly summary of the gap
 */
export function getGapSummary(gap: Gap): string {
  const severityLabels: Record<GapSeverity, string> = {
    high: "Critical",
    medium: "Important",
    low: "Nice-to-have",
  };

  const typeLabels: Record<GapType, string> = {
    coverage: "Coverage Gap",
    performance: "Performance Gap",
    recovery: "Recovery Gap",
    redundancy: "Redundancy Opportunity",
    misuse: "Shoe Misuse",
  };

  return `${severityLabels[gap.severity]} ${typeLabels[gap.type]}`;
}
