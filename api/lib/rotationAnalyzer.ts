// ============================================================================
// ROTATION ANALYSIS LOGIC
// Analyzes current shoe rotation to identify coverage, gaps, and redundancies
// ============================================================================

import type {
  CurrentShoe,
  RunnerProfile,
  RotationAnalysis,
  ShoeRole,
  Shoe
} from '../types';

// ============================================================================
// EXPECTED ROLES BY PROFILE
// ============================================================================

/**
 * Determine expected roles based on runner's training pattern
 * Returns the roles a runner should ideally have covered
 */
function getExpectedRoles(profile: RunnerProfile): ShoeRole[] {
  const expected = new Set<ShoeRole>();

  // Base expectations from running pattern
  const pattern = profile.runningPattern || "mostly_easy"; // Default if not specified

  switch (pattern) {
    case "infrequent":
      // Casual runners need just one versatile daily trainer
      expected.add("daily");
      break;

    case "mostly_easy":
      // Easy-focused runners need daily trainer and recovery option
      expected.add("daily");
      expected.add("easy");
      break;

    case "structured_training":
      // Structured training needs daily, easy, and tempo coverage
      expected.add("daily");
      expected.add("easy");
      expected.add("tempo");
      break;

    case "workouts":
      // Workout-focused runners need daily, tempo, and speed options
      expected.add("daily");
      expected.add("tempo");
      expected.add("intervals");
      break;

    case "long_run_focus":
      // Long run focused needs daily and long run coverage
      expected.add("daily");
      expected.add("long");
      break;
  }

  // Adjust based on primary goal
  switch (profile.primaryGoal) {
    case "train_for_race":
      // Training for races needs tempo work
      expected.add("tempo");
      break;

    case "improve_pace":
      // Improving pace needs tempo capability
      expected.add("tempo");
      break;

    case "train_for_race":
      // Training for races typically involves varied paces
      expected.add("tempo");
      expected.add("intervals");
      break;
  }

  // Advanced/racing runners likely need more specialized shoes
  if (profile.experience === "racing_focused" || profile.experience === "advanced") {
    expected.add("tempo");
    if (profile.experience === "racing_focused") {
      expected.add("race");
    }
  }

  return Array.from(expected);
}

// ============================================================================
// REDUNDANCY DETECTION
// ============================================================================

/**
 * Check if two shoes are similar in feel profile
 * Similar = within 1 point on key feel dimensions
 */
function areSimilarInFeel(
  shoe1: CurrentShoe,
  shoe2: CurrentShoe,
  catalogue: Shoe[]
): boolean {
  // Find shoe data in catalogue
  const shoe1Data = catalogue.find(s => s.shoe_id === shoe1.shoeId);
  const shoe2Data = catalogue.find(s => s.shoe_id === shoe2.shoeId);

  if (!shoe1Data || !shoe2Data) {
    return false; // Can't compare if not in catalogue
  }

  // Check if similar on key feel dimensions (within 1 point)
  const cushionDiff = Math.abs(shoe1Data.cushion_softness_1to5 - shoe2Data.cushion_softness_1to5);
  const stabilityDiff = Math.abs(shoe1Data.stability_1to5 - shoe2Data.stability_1to5);
  const bounceDiff = Math.abs(shoe1Data.bounce_1to5 - shoe2Data.bounce_1to5);

  // Similar if all dimensions are within 1 point
  return cushionDiff <= 1 && stabilityDiff <= 1 && bounceDiff <= 1;
}

/**
 * Find redundancies in the rotation
 * A redundancy = 2+ shoes with overlapping roles and similar feel
 */
function findRedundancies(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): RotationAnalysis['redundancies'] {
  const redundancies: RotationAnalysis['redundancies'] = [];

  // Group shoes by role
  const roleGroups = new Map<ShoeRole, CurrentShoe[]>();

  for (const shoe of currentShoes) {
    if (!shoe.roles || shoe.roles.length === 0) continue;

    for (const role of shoe.roles) {
      if (!roleGroups.has(role)) {
        roleGroups.set(role, []);
      }
      roleGroups.get(role)!.push(shoe);
    }
  }

  // Check each role group for redundancies
  roleGroups.forEach((shoes, role) => {
    if (shoes.length < 2) return; // Need at least 2 shoes to be redundant

    // Find clusters of similar shoes within this role
    const checked = new Set<string>();

    for (let i = 0; i < shoes.length; i++) {
      if (checked.has(shoes[i].shoeId)) continue;

      const cluster: CurrentShoe[] = [shoes[i]];
      checked.add(shoes[i].shoeId);

      // Find all other shoes similar to this one
      for (let j = i + 1; j < shoes.length; j++) {
        if (checked.has(shoes[j].shoeId)) continue;

        if (areSimilarInFeel(shoes[i], shoes[j], catalogue)) {
          cluster.push(shoes[j]);
          checked.add(shoes[j].shoeId);
        }
      }

      // If we found 2+ similar shoes in the same role, that's a redundancy
      if (cluster.length >= 2) {
        // Find all overlapping roles among the cluster
        const overlappingRoles = new Set<ShoeRole>();
        for (const shoe of cluster) {
          for (const r of shoe.roles) {
            // Check if all shoes in cluster have this role
            if (cluster.every(s => s.roles.includes(r))) {
              overlappingRoles.add(r);
            }
          }
        }

        redundancies.push({
          shoeIds: cluster.map(s => s.shoeId),
          overlappingRoles: Array.from(overlappingRoles),
        });
      }
    }
  });

  return redundancies;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze the runner's current shoe rotation
 * Identifies coverage, gaps, redundancies, and quality signals
 *
 * @param currentShoes - Runner's current shoe rotation
 * @param profile - Runner's profile (for understanding expected needs)
 * @param catalogue - Full shoe catalogue (needed for redundancy detection)
 * @returns Complete rotation analysis
 */
export function analyzeRotation(
  currentShoes: CurrentShoe[],
  profile: RunnerProfile,
  catalogue: Shoe[]
): RotationAnalysis {
  // Edge case: empty rotation
  if (!currentShoes || currentShoes.length === 0) {
    const expectedRoles = getExpectedRoles(profile);
    return {
      coveredRoles: [],
      missingRoles: expectedRoles,
      redundancies: [],
      allShoesLiked: false,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    };
  }

  // 1. IDENTIFY COVERED ROLES
  const coveredRolesSet = new Set<ShoeRole>();
  for (const shoe of currentShoes) {
    if (shoe.roles && shoe.roles.length > 0) {
      shoe.roles.forEach(role => coveredRolesSet.add(role));
    }
  }
  const coveredRoles = Array.from(coveredRolesSet);

  // 2. IDENTIFY MISSING ROLES
  const expectedRoles = getExpectedRoles(profile);
  const missingRoles = expectedRoles.filter(role => !coveredRolesSet.has(role));

  // 3. DETECT REDUNDANCIES
  const redundancies = findRedundancies(currentShoes, catalogue);

  // 4. QUALITY SIGNALS
  const allShoesLiked = currentShoes.every(shoe => shoe.sentiment === "like");
  const hasDislikedShoes = currentShoes.some(shoe => shoe.sentiment === "dislike");
  const hasNearReplacementShoes = currentShoes.some(
    shoe => shoe.lifecycle === "near_replacement"
  );

  return {
    coveredRoles,
    missingRoles,
    redundancies,
    allShoesLiked,
    hasDislikedShoes,
    hasNearReplacementShoes,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get expected roles for a profile (useful for testing/debugging)
 */
export function getExpectedRolesForProfile(profile: RunnerProfile): ShoeRole[] {
  return getExpectedRoles(profile);
}

/**
 * Check if a rotation has adequate coverage for the runner's needs
 */
export function hasAdequateCoverage(
  analysis: RotationAnalysis,
  profile: RunnerProfile
): boolean {
  // Adequate if no critical roles are missing
  // Critical roles depend on experience and goals

  const criticalRoles = new Set<ShoeRole>();

  // Everyone needs at least a daily trainer
  criticalRoles.add("daily");

  // Structured training needs tempo coverage
  if (profile.runningPattern === "structured_training" ||
      profile.runningPattern === "workouts") {
    criticalRoles.add("tempo");
  }

  // Racing focused experience needs race shoes
  if (profile.experience === "racing_focused") {
    criticalRoles.add("race");
  }

  // Check if all critical roles are covered
  return Array.from(criticalRoles).every(role =>
    analysis.coveredRoles.includes(role)
  );
}

/**
 * Get a summary of rotation health (useful for UI)
 */
export function getRotationHealthSummary(analysis: RotationAnalysis): {
  status: "healthy" | "needs_attention" | "critical";
  issues: string[];
} {
  const issues: string[] = [];

  if (analysis.missingRoles.length > 0) {
    issues.push(`Missing coverage for: ${analysis.missingRoles.join(", ")}`);
  }

  if (analysis.hasDislikedShoes) {
    issues.push("Has shoes you don't like");
  }

  if (analysis.hasNearReplacementShoes) {
    issues.push("Has shoes nearing end of life");
  }

  if (analysis.redundancies.length > 0) {
    issues.push(`${analysis.redundancies.length} redundant shoe group(s)`);
  }

  // Determine status
  let status: "healthy" | "needs_attention" | "critical";

  if (issues.length === 0 && analysis.allShoesLiked) {
    status = "healthy";
  } else if (analysis.missingRoles.length > 2 || analysis.hasDislikedShoes) {
    status = "critical";
  } else {
    status = "needs_attention";
  }

  return { status, issues };
}
