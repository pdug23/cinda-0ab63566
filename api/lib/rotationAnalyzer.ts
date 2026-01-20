// ============================================================================
// ROTATION ANALYSIS LOGIC
// Analyzes current shoe rotation to identify coverage, gaps, and redundancies
// Updated for run type -> archetype model
// ============================================================================

import type {
  RotationAnalysis,
  RotationHealth,
  CurrentShoe,
  RunnerProfile,
  Shoe,
  RunType,
  ShoeArchetype,
} from '../types.js';
import {
  RUN_TYPE_MAPPING,
  shoeHasArchetype,
  getShoeArchetypes,
  shoeIsSuitableFor
} from '../types.js';

// ============================================================================
// EXPECTED RUN TYPES BY PROFILE
// ============================================================================

/**
 * Determine expected run types based on runner's training pattern
 * Returns the run types a runner should ideally have covered
 */
function getExpectedRunTypes(profile: RunnerProfile): RunType[] {
  const expected = new Set<RunType>();

  // Base expectations from running pattern
  const pattern = profile.runningPattern || "mostly_easy";

  switch (pattern) {
    case "infrequent":
      // Casual runners need just one versatile daily trainer
      expected.add("all_runs");
      break;

    case "mostly_easy":
      // Easy-focused runners need daily + recovery coverage
      expected.add("all_runs");
      expected.add("recovery");
      break;

    case "structured_training":
      // Structured training needs variety
      expected.add("all_runs");
      expected.add("recovery");
      expected.add("workouts");
      expected.add("long_runs");
      break;

    case "workout_focused":
      // Workout-focused runners need daily + workouts
      expected.add("all_runs");
      expected.add("workouts");
      break;
  }

  // Adjust based on primary goal
  switch (profile.primaryGoal) {
    case "race_training":
      expected.add("workouts");
      expected.add("races");
      break;

    case "get_faster":
      expected.add("workouts");
      break;

    case "injury_comeback":
      expected.add("recovery");
      break;
  }

  // Trail running
  if (profile.trailRunning === "most_or_all" || profile.trailRunning === "infrequently") {
    expected.add("trail");
  }

  return Array.from(expected);
}

/**
 * Determine expected archetypes based on runner's profile
 */
function getExpectedArchetypes(profile: RunnerProfile): ShoeArchetype[] {
  const archetypes = new Set<ShoeArchetype>();

  // Everyone should have a daily trainer
  archetypes.add("daily_trainer");

  // Based on running pattern
  if (profile.runningPattern === "structured_training" ||
      profile.runningPattern === "mostly_easy") {
    archetypes.add("recovery_shoe");
  }

  if (profile.runningPattern === "structured_training" ||
      profile.runningPattern === "workout_focused") {
    archetypes.add("workout_shoe");
  }

  // Based on goal
  if (profile.primaryGoal === "race_training") {
    archetypes.add("race_shoe");
    archetypes.add("workout_shoe");
  }

  if (profile.primaryGoal === "get_faster") {
    archetypes.add("workout_shoe");
  }

  if (profile.primaryGoal === "injury_comeback") {
    archetypes.add("recovery_shoe");
  }

  // Trail
  if (profile.trailRunning === "most_or_all" || profile.trailRunning === "infrequently") {
    archetypes.add("trail_shoe");
  }

  return Array.from(archetypes);
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
  const shoe1Data = catalogue.find(s => s.shoe_id === shoe1.shoeId);
  const shoe2Data = catalogue.find(s => s.shoe_id === shoe2.shoeId);

  if (!shoe1Data || !shoe2Data) {
    return false;
  }

  const cushionDiff = Math.abs(shoe1Data.cushion_softness_1to5 - shoe2Data.cushion_softness_1to5);
  const stabilityDiff = Math.abs(shoe1Data.stability_1to5 - shoe2Data.stability_1to5);
  const bounceDiff = Math.abs(shoe1Data.bounce_1to5 - shoe2Data.bounce_1to5);

  return cushionDiff <= 1 && stabilityDiff <= 1 && bounceDiff <= 1;
}

/**
 * Find redundancies in the rotation
 * A redundancy = 2+ shoes with overlapping run types and similar feel
 */
function findRedundancies(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): RotationAnalysis['redundancies'] {
  const redundancies: RotationAnalysis['redundancies'] = [];

  // Group shoes by run type
  const runTypeGroups = new Map<RunType, CurrentShoe[]>();

  for (const shoe of currentShoes) {
    if (!shoe.runTypes || shoe.runTypes.length === 0) continue;

    for (const runType of shoe.runTypes) {
      if (!runTypeGroups.has(runType)) {
        runTypeGroups.set(runType, []);
      }
      runTypeGroups.get(runType)!.push(shoe);
    }
  }

  // Check each run type group for redundancies
  runTypeGroups.forEach((shoes, runType) => {
    if (shoes.length < 2) return;

    const checked = new Set<string>();

    for (let i = 0; i < shoes.length; i++) {
      if (checked.has(shoes[i].shoeId)) continue;

      const cluster: CurrentShoe[] = [shoes[i]];
      checked.add(shoes[i].shoeId);

      for (let j = i + 1; j < shoes.length; j++) {
        if (checked.has(shoes[j].shoeId)) continue;

        if (areSimilarInFeel(shoes[i], shoes[j], catalogue)) {
          cluster.push(shoes[j]);
          checked.add(shoes[j].shoeId);
        }
      }

      if (cluster.length >= 2) {
        // Find all overlapping run types among the cluster
        const overlappingRunTypes = new Set<RunType>();
        for (const shoe of cluster) {
          for (const rt of shoe.runTypes || []) {
            if (cluster.every(s => s.runTypes?.includes(rt))) {
              overlappingRunTypes.add(rt);
            }
          }
        }

        redundancies.push({
          shoeIds: cluster.map(s => s.shoeId),
          overlappingRunTypes: Array.from(overlappingRunTypes),
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
 */
export function analyzeRotation(
  currentShoes: CurrentShoe[],
  profile: RunnerProfile,
  catalogue: Shoe[]
): RotationAnalysis {
  console.log('[analyzeRotation] Input:', {
    currentShoesCount: currentShoes?.length || 0,
    currentShoes: currentShoes?.map(s => ({
      shoeId: s.shoeId,
      runTypes: s.runTypes,
      sentiment: s.sentiment
    })),
    profile: {
      runningPattern: profile.runningPattern,
      primaryGoal: profile.primaryGoal,
      experience: profile.experience
    }
  });

  // Edge case: empty rotation
  if (!currentShoes || currentShoes.length === 0) {
    const expectedRunTypes = getExpectedRunTypes(profile);
    const expectedArchetypes = getExpectedArchetypes(profile);
    console.log('[analyzeRotation] Empty rotation - expected archetypes:', expectedArchetypes);
    return {
      coveredRunTypes: [],
      uncoveredRunTypes: expectedRunTypes,
      coveredArchetypes: [],
      missingArchetypes: expectedArchetypes,
      redundancies: [],
      allShoesLoved: false,
      hasDislikedShoes: false,
      hasNearReplacementShoes: false,
    };
  }

  // 1. IDENTIFY COVERED RUN TYPES
  const coveredRunTypesSet = new Set<RunType>();
  for (const shoe of currentShoes) {
    if (shoe.runTypes && shoe.runTypes.length > 0) {
      shoe.runTypes.forEach(rt => coveredRunTypesSet.add(rt));
    }
  }
  const coveredRunTypes = Array.from(coveredRunTypesSet);

  // 2. IDENTIFY UNCOVERED RUN TYPES
  const expectedRunTypes = getExpectedRunTypes(profile);
  const uncoveredRunTypes = expectedRunTypes.filter(rt => !coveredRunTypesSet.has(rt));

  // 3. IDENTIFY COVERED ARCHETYPES
  const coveredArchetypesSet = new Set<ShoeArchetype>();
  for (const userShoe of currentShoes) {
    const shoe = catalogue.find(s => s.shoe_id === userShoe.shoeId);
    if (shoe) {
      const archetypes = getShoeArchetypes(shoe);
      archetypes.forEach(a => coveredArchetypesSet.add(a));
    }
  }
  const coveredArchetypes = Array.from(coveredArchetypesSet);

  // 4. IDENTIFY MISSING ARCHETYPES
  const expectedArchetypes = getExpectedArchetypes(profile);
  const missingArchetypes = expectedArchetypes.filter(a => !coveredArchetypesSet.has(a));

  // 5. DETECT REDUNDANCIES
  const redundancies = findRedundancies(currentShoes, catalogue);

  // 6. QUALITY SIGNALS
  const allShoesLoved = currentShoes.every(shoe => shoe.sentiment === "love");
  const hasDislikedShoes = currentShoes.some(shoe => shoe.sentiment === "dislike");
  const hasNearReplacementShoes = currentShoes.some(
    shoe => shoe.lifecycle === "near_replacement"
  );

  const result = {
    coveredRunTypes,
    uncoveredRunTypes,
    coveredArchetypes,
    missingArchetypes,
    redundancies,
    allShoesLoved,
    hasDislikedShoes,
    hasNearReplacementShoes,
  };

  console.log('[analyzeRotation] Result:', {
    coveredRunTypes: result.coveredRunTypes,
    uncoveredRunTypes: result.uncoveredRunTypes,
    coveredArchetypes: result.coveredArchetypes,
    missingArchetypes: result.missingArchetypes,
    redundanciesCount: result.redundancies.length,
    allShoesLoved: result.allShoesLoved,
    hasDislikedShoes: result.hasDislikedShoes
  });

  return result;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get expected run types for a profile (useful for testing/debugging)
 */
export function getExpectedRunTypesForProfile(profile: RunnerProfile): RunType[] {
  return getExpectedRunTypes(profile);
}

/**
 * Get expected archetypes for a profile
 */
export function getExpectedArchetypesForProfile(profile: RunnerProfile): ShoeArchetype[] {
  return getExpectedArchetypes(profile);
}

/**
 * Check if a rotation has adequate coverage for the runner's needs
 */
export function hasAdequateCoverage(
  analysis: RotationAnalysis,
  profile: RunnerProfile
): boolean {
  // Adequate if no critical archetypes are missing
  const criticalArchetypes = new Set<ShoeArchetype>();

  // Everyone needs at least a daily trainer
  criticalArchetypes.add("daily_trainer");

  // Structured training needs workout coverage
  if (profile.runningPattern === "structured_training" ||
      profile.runningPattern === "workout_focused") {
    criticalArchetypes.add("workout_shoe");
  }

  // Racing focused needs race shoes
  if (profile.primaryGoal === "race_training" && profile.experience === "competitive") {
    criticalArchetypes.add("race_shoe");
  }

  // Check if all critical archetypes are covered
  return Array.from(criticalArchetypes).every(archetype =>
    analysis.coveredArchetypes.includes(archetype)
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

  if (analysis.uncoveredRunTypes.length > 0) {
    issues.push(`Missing coverage for: ${analysis.uncoveredRunTypes.join(", ")}`);
  }

  if (analysis.missingArchetypes.length > 0) {
    issues.push(`Missing shoe types: ${analysis.missingArchetypes.map(a => a.replace('_', ' ')).join(", ")}`);
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

  if (issues.length === 0 && analysis.allShoesLoved) {
    status = "healthy";
  } else if (analysis.missingArchetypes.length > 2 || analysis.hasDislikedShoes) {
    status = "critical";
  } else {
    status = "needs_attention";
  }

  return { status, issues };
}

// ============================================================================
// ROTATION HEALTH SCORING
// Internal scoring system for tier selection and AI summaries
// ============================================================================

/**
 * Get covered archetypes from current shoes
 * Helper to avoid duplicating logic from analyzeRotation
 */
function getCoveredArchetypes(
  currentShoes: CurrentShoe[],
  catalogue: Shoe[]
): ShoeArchetype[] {
  const coveredArchetypesSet = new Set<ShoeArchetype>();
  for (const userShoe of currentShoes) {
    const shoe = catalogue.find(s => s.shoe_id === userShoe.shoeId);
    if (shoe) {
      const archetypes = getShoeArchetypes(shoe);
      archetypes.forEach(a => coveredArchetypesSet.add(a));
    }
  }
  return Array.from(coveredArchetypesSet);
}

/**
 * Calculate variety score based on range across feel dimensions
 * Higher score = more diverse rotation
 */
function calculateVariety(shoes: Shoe[]): number {
  if (shoes.length <= 1) return 0;

  const dimensions = [
    shoes.map(s => s.cushion_softness_1to5),
    shoes.map(s => s.stability_1to5),
    shoes.map(s => s.rocker_1to5),
    shoes.map(s => Math.min(Math.floor(s.heel_drop_mm / 3), 4)), // normalize to 0-4
  ];

  const dimensionScores = dimensions.map(values => {
    const range = Math.max(...values) - Math.min(...values);
    return Math.min(range * 25, 100);
  });

  return Math.round(dimensionScores.reduce((a, b) => a + b, 0) / dimensionScores.length);
}

/**
 * Calculate load resilience based on shoe count vs weekly volume
 * Higher volume needs more shoes for rotation
 */
function calculateLoadResilience(shoeCount: number, profile: RunnerProfile): number {
  if (!profile.weeklyVolume) return 80; // default assumption

  const volumeKm = profile.weeklyVolume.unit === "mi"
    ? profile.weeklyVolume.value * 1.6
    : profile.weeklyVolume.value;

  let idealCount: number;
  if (volumeKm < 30) idealCount = 1;
  else if (volumeKm < 50) idealCount = 2;
  else if (volumeKm < 80) idealCount = 3;
  else idealCount = 4;

  const shortfall = Math.max(0, idealCount - shoeCount);
  return Math.max(0, 100 - (shortfall * 33));
}

/**
 * Calculate goal alignment based on whether rotation supports stated goal
 */
function calculateGoalAlignment(
  profile: RunnerProfile,
  coveredArchetypes: ShoeArchetype[]
): number {
  const has = (a: ShoeArchetype) => coveredArchetypes.includes(a);

  switch (profile.primaryGoal) {
    case "race_training":
      if (has("workout_shoe") && has("race_shoe")) return 100;
      if (has("workout_shoe") || has("race_shoe")) return 60;
      return 20;

    case "get_faster":
      return has("workout_shoe") ? 100 : 40;

    case "injury_comeback":
      return has("recovery_shoe") ? 100 : 30;

    case "general_fitness":
      return has("daily_trainer") ? 100 : 50;

    default:
      return 70;
  }
}

/**
 * Calculate overall rotation health score across 4 dimensions
 * Internal metric - not displayed directly to users
 * Used for tier selection and AI summary generation
 */
export function calculateRotationHealth(
  currentShoes: CurrentShoe[],
  profile: RunnerProfile,
  catalogue: Shoe[]
): RotationHealth {
  // Get expected and covered archetypes
  const expected = getExpectedArchetypes(profile);
  const covered = getCoveredArchetypes(currentShoes, catalogue);

  // 1. Coverage score (40% weight)
  let coverage: number;
  if (expected.length === 0) {
    coverage = 100;
  } else {
    const missingCount = expected.filter(a => !covered.includes(a)).length;
    coverage = Math.round(100 * (expected.length - missingCount) / expected.length);
  }

  // 2. Variety score (10% weight)
  // Resolve current shoes to Shoe objects
  const resolvedShoes: Shoe[] = [];
  for (const userShoe of currentShoes) {
    const shoe = catalogue.find(s => s.shoe_id === userShoe.shoeId);
    if (shoe) resolvedShoes.push(shoe);
  }
  const variety = calculateVariety(resolvedShoes);

  // 3. Load resilience score (20% weight)
  const loadResilience = calculateLoadResilience(currentShoes.length, profile);

  // 4. Goal alignment score (30% weight)
  const goalAlignment = calculateGoalAlignment(profile, covered);

  // Calculate weighted overall score
  const overall = Math.round(
    coverage * 0.40 +
    variety * 0.10 +
    loadResilience * 0.20 +
    goalAlignment * 0.30
  );

  const result: RotationHealth = {
    coverage,
    variety,
    loadResilience,
    goalAlignment,
    overall,
  };

  console.log('[calculateRotationHealth] Result:', result);

  return result;
}
