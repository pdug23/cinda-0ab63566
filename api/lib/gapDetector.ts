// ============================================================================
// GAP DETECTION LOGIC
// Identifies the single most important gap in a runner's shoe rotation
// ============================================================================

import type {
  Gap,
  GapType,
  GapSeverity,
  RotationAnalysis,
  RunnerProfile,
  CurrentShoe,
  Shoe,
  ShoeRole
} from '../types.js';

// ============================================================================
// COVERAGE GAP DETECTION
// ============================================================================

/**
 * Check if there's a coverage gap (missing role for their running pattern)
 * Coverage gaps are HIGHEST PRIORITY
 */
function checkCoverageGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[]
): Gap | null {
  if (analysis.missingRoles.length === 0) {
    return null; // No coverage gaps
  }

  // Determine which missing role is most critical
  const criticalRoles = getCriticalRoles(profile);
  const missingCritical = analysis.missingRoles.filter(role =>
    criticalRoles.includes(role)
  );

  // If missing critical role, that's high severity
  if (missingCritical.length > 0) {
    const role = missingCritical[0]; // Take first critical missing role
    return {
      type: "coverage",
      severity: "high",
      reasoning: getCoverageReasoning(role, profile, "high"),
      missingCapability: role,
    };
  }

  // If missing non-critical but useful role, medium severity
  const role = analysis.missingRoles[0];
  return {
    type: "coverage",
    severity: "medium",
    reasoning: getCoverageReasoning(role, profile, "medium"),
    missingCapability: role,
  };
}

/**
 * Get critical roles based on profile
 */
function getCriticalRoles(profile: RunnerProfile): ShoeRole[] {
  const critical: ShoeRole[] = []; // Start empty, add based on context

  // Only add daily if they truly need it (beginner or no other coverage)
  if (profile.experience === "beginner") {
    critical.push("daily");
  }

  // Add based on running pattern
  if (profile.runningPattern === "long_run_focus") {
    critical.push("long");
  }
  if (profile.runningPattern === "structured_training" ||
    profile.runningPattern === "workouts") {
    critical.push("tempo");
  }

  // Add based on goals
  if (profile.primaryGoal === "train_for_race" ||
    profile.primaryGoal === "improve_pace") {
    critical.push("tempo");
  }

  // Racing focused needs race shoes
  if (profile.experience === "racing_focused") {
    critical.push("race");
  }

  return critical;
}

/**
 * Generate human-readable reasoning for coverage gap
 */
function getCoverageReasoning(
  role: ShoeRole,
  profile: RunnerProfile,
  severity: GapSeverity
): string {
  const roleReasoningMap: Record<ShoeRole, Record<string, string>> = {
    daily: {
      high: "You'd benefit from a versatile daily trainer to start building your rotation. This will be your go-to shoe for most runs.",
      medium: "Adding a daily trainer would give you a reliable workhorse for easy and moderate-pace runs.",
    },
    easy: {
      high: "With your training volume, you'd benefit from a comfortable easy/recovery shoe to protect your legs on easy days.",
      medium: "An easy-day shoe would help you recover better between harder efforts.",
    },
    long: {
      high: "You're focused on long runs but don't have a shoe built for sustained comfort. A long-run shoe will make those miles feel better.",
      medium: "A dedicated long-run shoe would provide extra cushioning and comfort for your highest-mileage days.",
    },
    tempo: {
      high: `You're ${profile.primaryGoal === "train_for_race" ? "training for a race" : "working on pace"} but don't have a shoe for tempo workouts. A responsive trainer would help you nail those threshold efforts.`,
      medium: "A tempo shoe would give you a firmer, more responsive option for your faster-paced training runs.",
    },
    intervals: {
      high: "Your workout-focused training could use a lightweight, responsive shoe for interval sessions.",
      medium: "Adding a speed shoe would give you a snappy option for track workouts and intervals.",
    },
    race: {
      high: "As a racing-focused runner, you'd benefit from a proper race-day shoe with a plate for your goal races.",
      medium: "A carbon-plated race shoe would give you an extra edge on race day.",
    },
    trail: {
      high: "You'd benefit from a trail shoe with grip and protection for off-road running.",
      medium: "A trail shoe would let you safely explore off-road routes.",
    },
  };

  return roleReasoningMap[role]?.[severity] || `You're missing a ${role} shoe to round out your rotation.`;
}

// ============================================================================
// PERFORMANCE GAP DETECTION
// ============================================================================

/**
 * Check if there's a performance gap (needs faster shoes)
 * Only relevant if profile indicates pace/racing goals
 */
function checkPerformanceGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  // Only check performance if goal is pace/racing oriented
  const performanceGoals = ["improve_pace", "train_for_race"];
  const isPerformanceFocused = performanceGoals.includes(profile.primaryGoal) ||
    profile.experience === "racing_focused" ||
    profile.experience === "advanced";

  if (!isPerformanceFocused) {
    return null; // Performance gap not relevant
  }

  // Check if they have fast shoe coverage
  const hasTempo = analysis.coveredRoles.includes("tempo");
  const hasIntervals = analysis.coveredRoles.includes("intervals");
  const hasRace = analysis.coveredRoles.includes("race");

  // No fast shoes at all = high severity
  if (!hasTempo && !hasIntervals && !hasRace) {
    return {
      type: "performance",
      severity: "high",
      reasoning: `You're focused on ${profile.primaryGoal === "train_for_race" ? "racing" : "improving pace"} but your rotation lacks responsive shoes for faster work. A tempo or workout shoe would unlock your speed training.`,
      missingCapability: "responsive/fast shoe for workouts",
    };
  }

  // Has tempo but no race shoes for racing-focused runner = medium severity
  if (profile.experience === "racing_focused" && !hasRace) {
    return {
      type: "performance",
      severity: "medium",
      reasoning: "You have tempo coverage but could benefit from a carbon-plated race shoe to maximize performance on race day.",
      missingCapability: "race",
    };
  }

  // Has some fast shoes but limited variety = low severity
  const fastShoeCount = currentShoes.filter(s =>
    s.roles.some(r => ["tempo", "intervals", "race"].includes(r))
  ).length;

  if (fastShoeCount === 1) {
    return {
      type: "performance",
      severity: "low",
      reasoning: "You have one fast shoe but adding another would give you options for different workout intensities.",
      missingCapability: "varied fast shoes",
    };
  }

  return null; // Performance adequately covered
}

// ============================================================================
// RECOVERY GAP DETECTION
// ============================================================================

/**
 * Check if there's a recovery gap (needs more cushioning/protection)
 * Relevant for high-volume or structured training
 */
function checkRecoveryGap(
  analysis: RotationAnalysis,
  profile: RunnerProfile,
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): Gap | null {
  // Check if recovery is relevant for this runner
  const needsRecovery = profile.runningPattern === "structured_training" ||
    profile.runningPattern === "long_run_focus" ||
    profile.runningPattern === "mostly_easy";

  if (!needsRecovery) {
    return null; // Recovery gap not relevant
  }

  // Check if they have easy/recovery coverage
  const hasEasy = analysis.coveredRoles.includes("easy");
  const hasLong = analysis.coveredRoles.includes("long");

  // No recovery shoes at all = high severity for structured/long run folks
  if (!hasEasy && !hasLong) {
    const severity = (profile.runningPattern === "structured_training" ||
      profile.runningPattern === "long_run_focus") ? "high" : "medium";

    return {
      type: "recovery",
      severity,
      reasoning: severity === "high"
        ? "Your training volume would benefit from a protective, cushioned shoe for easy days and recovery runs. This will help you absorb the load and stay healthy."
        : "Adding a cushioned recovery shoe would help your legs bounce back between harder efforts.",
      missingCapability: "cushioned recovery shoe",
    };
  }

  // Check cushioning levels of existing shoes
  const shoeData = currentShoes
    .map(cs => catalogue.find(s => s.shoe_id === cs.shoeId))
    .filter((s): s is Shoe => s !== undefined);

  const hasMaxCushion = shoeData.some(s => s.cushion_softness_1to5 >= 4);

  // Has easy/long role but no max-cushion shoes = low severity
  if (!hasMaxCushion && (hasEasy || hasLong)) {
    return {
      type: "recovery",
      severity: "low",
      reasoning: "Your rotation has recovery shoes but they're on the firmer side. A plush, max-cushion option would give you more protection on tired-leg days.",
      missingCapability: "max-cushion easy shoe",
    };
  }

  return null; // Recovery adequately covered
}

// ============================================================================
// REDUNDANCY GAP DETECTION
// ============================================================================

/**
 * Check if there's a redundancy opportunity
 * Only flag if redundancy exists AND missing roles exist
 */
function checkRedundancyGap(
  analysis: RotationAnalysis
): Gap | null {
  // Need both redundancy and missing roles for this to be actionable
  if (analysis.redundancies.length === 0 || analysis.missingRoles.length === 0) {
    return null;
  }

  const redundancy = analysis.redundancies[0]; // Take first redundancy
  const missingRole = analysis.missingRoles[0];

  // Severity based on size of redundancy
  let severity: GapSeverity = "low";
  if (redundancy.shoeIds.length >= 3 && analysis.missingRoles.length >= 2) {
    severity = "high";
  } else if (redundancy.shoeIds.length >= 2) {
    severity = "medium";
  }

  return {
    type: "redundancy",
    severity,
    reasoning: `You have ${redundancy.shoeIds.length} similar shoes covering ${redundancy.overlappingRoles.join("/")} but nothing for ${missingRole}. Swapping one of the similar shoes would add versatility to your rotation.`,
    redundantShoes: redundancy.shoeIds,
    missingCapability: missingRole,
  };
}

// ============================================================================
// MAIN GAP IDENTIFICATION FUNCTION
// ============================================================================

/**
 * Identify the single most important gap in the rotation
 * Prioritizes: Coverage > Performance > Recovery > Redundancy
 *
 * @param analysis - Rotation analysis from rotationAnalyzer
 * @param profile - Runner profile
 * @param currentShoes - Current shoe rotation
 * @param catalogue - Full shoe catalogue
 * @returns The primary gap to address
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
      missingCapability: "daily",
    };
  }

  // High volume runners need more shoes
  if (profile.weeklyVolume) {
    const volumeKm = profile.weeklyVolume.unit === "mi"
      ? profile.weeklyVolume.value * 1.6
      : profile.weeklyVolume.value;

    const shoeCount = currentShoes.length;

    // 50+ km/week with only 1 shoe = high priority
    if (volumeKm >= 50 && shoeCount < 2) {
      return {
        type: "coverage",
        severity: "high",
        reasoning: `Running ${profile.weeklyVolume.value}${profile.weeklyVolume.unit}/week on a single shoe puts a lot of stress on both you and the shoe. Rotating between at least 2 shoes helps prevent injury and extends shoe life.`,
        missingCapability: "rotation variety",
      };
    }

    // 70+ km/week with only 2 shoes = medium priority
    if (volumeKm >= 70 && shoeCount < 3) {
      return {
        type: "coverage",
        severity: "medium",
        reasoning: `With ${profile.weeklyVolume.value}${profile.weeklyVolume.unit}/week, you'd benefit from a third shoe to spread the load and give you options for different workouts.`,
        missingCapability: "rotation variety",
      };
    }

    // 100+ km/week with only 3 shoes = low priority
    if (volumeKm >= 100 && shoeCount < 4) {
      return {
        type: "coverage",
        severity: "low",
        reasoning: `At ${profile.weeklyVolume.value}${profile.weeklyVolume.unit}/week, a fourth shoe would give you more flexibility for recovery days, workouts, and long runs.`,
        missingCapability: "rotation variety",
      };
    }
  }

  // Priority 1: Coverage gaps (highest priority)
  const coverageGap = checkCoverageGap(analysis, profile, currentShoes);
  if (coverageGap && coverageGap.severity === "high") {
    return coverageGap; // Critical coverage gap - return immediately
  }

  // Priority 2: Performance gaps (if pace/racing focused)
  const performanceGap = checkPerformanceGap(analysis, profile, currentShoes, catalogue);
  if (performanceGap && performanceGap.severity === "high") {
    return performanceGap; // High-priority performance gap
  }

  // If we have medium coverage gap, return it now
  if (coverageGap && coverageGap.severity === "medium") {
    return coverageGap;
  }

  // Priority 3: Recovery gaps (if high volume/structured training)
  const recoveryGap = checkRecoveryGap(analysis, profile, currentShoes, catalogue);
  if (recoveryGap && recoveryGap.severity === "high") {
    return recoveryGap; // High-priority recovery gap
  }

  // Return any remaining gaps by priority
  if (performanceGap && performanceGap.severity === "medium") {
    return performanceGap;
  }

  if (recoveryGap && recoveryGap.severity === "medium") {
    return recoveryGap;
  }

  // Priority 4: Redundancy opportunities (lowest priority)
  const redundancyGap = checkRedundancyGap(analysis);
  if (redundancyGap) {
    return redundancyGap;
  }

  // Return low-severity gaps
  if (coverageGap) return coverageGap;
  if (performanceGap) return performanceGap;
  if (recoveryGap) return recoveryGap;

  // No gaps found - rotation is well-balanced
  // Suggest variety as low-severity coverage gap
  return {
    type: "coverage",
    severity: "low",
    reasoning: "Your rotation covers the basics well. Consider adding variety with a different shoe type or feel to expand your options.",
    missingCapability: "rotation variety",
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
  };

  return `${severityLabels[gap.severity]} ${typeLabels[gap.type]}`;
}
