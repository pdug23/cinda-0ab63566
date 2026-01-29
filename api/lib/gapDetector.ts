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

const ARCHETYPE_GAP_MESSAGES: Record<ShoeArchetype, string> = {
  "daily_trainer": "Your running pattern suggests you need a versatile daily trainer to handle your regular mileage.",
  "recovery_shoe": "Based on your training, a dedicated recovery shoe would help protect your legs on easy days.",
  "workout_shoe": "Your training focus suggests you need a responsive workout shoe for speed sessions.",
  "race_shoe": "A race shoe would help you maximize performance on race day.",
  "trail_shoe": "You need trail shoes for your off-road running."
};

// ============================================================================
// PROFILE-BASED ARCHETYPE REQUIREMENTS
// ============================================================================

/**
 * Determine which archetypes the runner's profile demands
 * Based on runningPattern, primaryGoal, and trailRunning preference
 */
function getRequiredArchetypes(profile: RunnerProfile): ShoeArchetype[] {
  const required = new Set<ShoeArchetype>();

  // Everyone needs at least a daily trainer
  required.add("daily_trainer");

  // Based on running pattern
  const pattern = profile.runningPattern || "mostly_easy";

  switch (pattern) {
    case "infrequent":
      // Just need a daily trainer
      break;

    case "mostly_easy":
      // Daily trainer + recovery shoe
      required.add("recovery_shoe");
      break;

    case "structured_training":
      // Full rotation: daily + recovery + workout
      required.add("recovery_shoe");
      required.add("workout_shoe");
      break;

    case "workout_focused":
      // Daily + workout
      required.add("workout_shoe");
      break;
  }

  // Based on primary goal
  switch (profile.primaryGoal) {
    case "race_training":
      required.add("workout_shoe");
      required.add("race_shoe");
      break;

    case "get_faster":
      required.add("workout_shoe");
      break;

    case "injury_comeback":
      required.add("recovery_shoe");
      break;
  }

  // Trail running
  if (profile.trailRunning === "most_or_all" || profile.trailRunning === "infrequently") {
    required.add("trail_shoe");
  }

  return Array.from(required);
}

/**
 * Get archetypes covered by current shoes
 * Super trainers count as covering daily_trainer, workout_shoe, and recovery_shoe
 */
function getCoveredArchetypes(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): ShoeArchetype[] {
  const covered = new Set<ShoeArchetype>();

  for (const userShoe of currentShoes) {
    const shoe = catalogue.find(s => s.shoe_id === userShoe.shoeId);
    if (!shoe) continue;

    if (shoeHasArchetype(shoe, 'daily_trainer')) covered.add('daily_trainer');
    if (shoeHasArchetype(shoe, 'recovery_shoe')) covered.add('recovery_shoe');
    if (shoeHasArchetype(shoe, 'workout_shoe')) covered.add('workout_shoe');
    if (shoeHasArchetype(shoe, 'race_shoe')) covered.add('race_shoe');
    if (shoeHasArchetype(shoe, 'trail_shoe')) covered.add('trail_shoe');

    // Super trainers cover daily_trainer, workout_shoe, and recovery_shoe
    if (shoe.is_super_trainer) {
      covered.add('daily_trainer');
      covered.add('workout_shoe');
      covered.add('recovery_shoe');
    }
  }

  return Array.from(covered);
}

/**
 * Detect gaps based on profile-demanded archetypes vs what current shoes cover
 */
function detectProfileArchetypeGaps(
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Array<{ archetype: ShoeArchetype; priority: number }> {
  const requiredArchetypes = getRequiredArchetypes(profile);
  const coveredArchetypes = getCoveredArchetypes(currentShoes, catalogue);

  console.log('[detectProfileArchetypeGaps] Required archetypes:', requiredArchetypes);
  console.log('[detectProfileArchetypeGaps] Covered archetypes:', coveredArchetypes);

  // Priority order for archetypes
  const archetypePriority: Record<ShoeArchetype, number> = {
    "daily_trainer": 1,
    "workout_shoe": 2,
    "race_shoe": 3,
    "recovery_shoe": 4,
    "trail_shoe": 5
  };

  const gaps: Array<{ archetype: ShoeArchetype; priority: number }> = [];

  for (const archetype of requiredArchetypes) {
    if (!coveredArchetypes.includes(archetype)) {
      console.log(`[detectProfileArchetypeGaps] GAP: Missing required archetype ${archetype}`);
      gaps.push({
        archetype,
        priority: archetypePriority[archetype] || 10
      });
    }
  }

  // Sort by priority
  gaps.sort((a, b) => a.priority - b.priority);

  console.log('[detectProfileArchetypeGaps] Final gaps:', gaps);
  return gaps;
}

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

  console.log('[detectCoverageGaps] All run types user does:', Array.from(allRunTypes));

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
      if (!shoe) {
        console.log(`[detectCoverageGaps] Shoe not found in catalogue: ${userShoe.shoeId}`);
        return false;
      }
      const shoeArchetypes = suitableArchetypes.filter(archetype => shoeHasArchetype(shoe, archetype));
      console.log(`[detectCoverageGaps] Shoe ${shoe.full_name} (${userShoe.shoeId}) archetypes for ${runType}:`, shoeArchetypes);

      // Super trainers can cover daily_trainer, workout_shoe, and recovery_shoe run types
      if (shoe.is_super_trainer && runType !== 'races' && runType !== 'trail') {
        console.log(`[detectCoverageGaps] Shoe ${shoe.full_name} is a super trainer - covers ${runType}`);
        return true;
      }

      return shoeArchetypes.length > 0;
    });

    if (!hasSuitable) {
      console.log(`[detectCoverageGaps] GAP: No suitable archetype for ${runType}, recommending ${suitableArchetypes[0]}`);
      gaps.push({
        runType,
        recommendedArchetype: suitableArchetypes[0], // First archetype is preferred
        priority: runTypePriority[runType] || 10
      });
    }
  }

  // Sort by priority (lower number = higher priority)
  gaps.sort((a, b) => a.priority - b.priority);

  console.log('[detectCoverageGaps] Final gaps:', gaps);
  return gaps;
}

/**
 * Check if there's a coverage gap (missing archetype for a run type OR profile demand)
 * Coverage gaps are HIGHEST PRIORITY
 *
 * Now checks TWO sources:
 * 1. Profile-demanded archetypes (based on runningPattern, primaryGoal)
 * 2. RunType-based gaps (if user assigns runTypes that their shoes can't handle)
 */
function checkCoverageGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  // First check profile-demanded archetypes (PRIORITY)
  const profileGaps = detectProfileArchetypeGaps(profile, currentShoes, catalogue);

  if (profileGaps.length > 0) {
    const primaryGap = profileGaps[0];

    // Determine severity based on archetype importance
    let severity: GapSeverity = "medium";

    // High severity for daily trainer (everyone needs one)
    if (primaryGap.archetype === "daily_trainer") {
      severity = "high";
    }
    // High severity for workout shoe if focused on speed/racing
    else if (primaryGap.archetype === "workout_shoe" &&
      (profile.primaryGoal === "get_faster" || profile.primaryGoal === "race_training")) {
      severity = "high";
    }
    // High severity for race shoe if race training
    else if (primaryGap.archetype === "race_shoe" && profile.primaryGoal === "race_training") {
      severity = "high";
    }
    // High severity for recovery if structured training or injury comeback
    else if (primaryGap.archetype === "recovery_shoe" &&
      (profile.runningPattern === "structured_training" || profile.primaryGoal === "injury_comeback")) {
      severity = "high";
    }
    // High severity for trail if doing most/all trails
    else if (primaryGap.archetype === "trail_shoe" && profile.trailRunning === "most_or_all") {
      severity = "high";
    }

    console.log('[checkCoverageGap] Found profile-based gap:', {
      archetype: primaryGap.archetype,
      severity,
      message: ARCHETYPE_GAP_MESSAGES[primaryGap.archetype]
    });

    return {
      type: "coverage",
      severity,
      reasoning: ARCHETYPE_GAP_MESSAGES[primaryGap.archetype],
      recommendedArchetype: primaryGap.archetype,
    };
  }

  // Then check runType-based gaps (if user assigned specific runTypes)
  const runTypeGaps = detectCoverageGaps(currentShoes, catalogue);

  if (runTypeGaps.length === 0) {
    return null; // No coverage gaps
  }

  // Take the highest priority gap
  const primaryGap = runTypeGaps[0];

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
  // Super trainers count as workout coverage
  const hasWorkoutShoe = currentShoes.some(us => {
    const shoe = catalogue.find(s => s.shoe_id === us.shoeId);
    return shoe && (shoeHasArchetype(shoe, 'workout_shoe') || shoe.is_super_trainer);
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
  // Super trainers and daily trainers can serve as recovery shoes
  const hasRecoveryShoe = currentShoes.some(us => {
    const shoe = catalogue.find(s => s.shoe_id === us.shoeId);
    return shoe && (shoeHasArchetype(shoe, 'recovery_shoe') || shoe.is_super_trainer || shoeHasArchetype(shoe, 'daily_trainer'));
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
  console.log('[identifyPrimaryGap] Input:', {
    currentShoesCount: currentShoes.length,
    coveredArchetypes: analysis.coveredArchetypes,
    missingArchetypes: analysis.missingArchetypes,
    coveredRunTypes: analysis.coveredRunTypes,
    uncoveredRunTypes: analysis.uncoveredRunTypes
  });

  // Edge case: Empty rotation
  if (currentShoes.length === 0) {
    console.log('[identifyPrimaryGap] Empty rotation - recommending daily_trainer');
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
    console.log('[identifyPrimaryGap] Found misuse gap:', misuseGap);
    return misuseGap;
  }

  // Priority 2: Coverage gaps
  const coverageGap = checkCoverageGap(analysis, profile, currentShoes, catalogue);
  console.log('[identifyPrimaryGap] Coverage gap check result:', coverageGap);
  if (coverageGap && coverageGap.severity === "high") {
    if (volumeContext) {
      coverageGap.reasoning = `${coverageGap.reasoning} ${volumeContext}`;
    }
    console.log('[identifyPrimaryGap] Found high-severity coverage gap:', coverageGap);
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
  const defaultGap: Gap = {
    type: "coverage",
    severity: volumeSeverityBoost ? "high" : "low",
    reasoning: volumeContext
      ? `Your rotation covers the basics well. ${volumeContext}`
      : "Your rotation covers the basics well. Consider adding variety with a different shoe type or feel to expand your options.",
    recommendedArchetype: "daily_trainer",
  };
  console.log('[identifyPrimaryGap] No significant gaps found, returning default:', defaultGap);
  return defaultGap;
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
