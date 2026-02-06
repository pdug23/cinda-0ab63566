// ============================================================================
// SHOE CAPABILITIES LOGIC
// Extracts shoe archetypes and detects misuse of shoes
// Updated for archetype-based model
// ============================================================================

import type {
  Shoe,
  ShoeArchetype,
  RunType,
  MisuseLevel
} from '../types.js';
import {
  shoeHasArchetype,
  getShoeArchetypes
} from '../types.js';

/**
 * Get the archetypes a shoe belongs to
 * Uses the new is_* columns from shoebase.json
 */
export function getShoeCapabilities(shoe: Shoe): ShoeArchetype[] {
  return getShoeArchetypes(shoe);
}

/**
 * Detect misuse: using a shoe for runs it's not designed for
 * Returns misuse level and message
 */
export function detectMisuse(
  userRunTypes: RunType[],
  archetypes: ShoeArchetype[],
  shoe: Shoe
): { level: MisuseLevel; message?: string } {

  // Check 1: Race shoe used for recovery or all_runs
  const isRaceShoe = archetypes.includes("race_shoe") && !archetypes.includes("daily_trainer");
  const usedForEasy = userRunTypes.includes("recovery") || userRunTypes.includes("all_runs");

  if (isRaceShoe && usedForEasy) {
    return {
      level: "severe",
      message: "This is a race-day shoe with a carbon plate. Using it daily will wear it out quickly and you're not getting the benefit it's designed for."
    };
  }

  // Check 2: Recovery shoe used for workouts or races
  const isRecoveryOnly = archetypes.includes("recovery_shoe") &&
    !archetypes.includes("workout_shoe") &&
    !archetypes.includes("race_shoe");
  const usedForSpeed = userRunTypes.includes("workouts") || userRunTypes.includes("races");

  if (isRecoveryOnly && usedForSpeed) {
    return {
      level: "severe",
      message: "This is a recovery shoe with soft cushioning. It's not designed for the demands of racing or speed work and could slow you down."
    };
  }

  // Check 3: Trail shoe used for road races
  const isTrailShoe = archetypes.includes("trail_shoe");
  const usedForRoadRace = userRunTypes.includes("races") && !userRunTypes.includes("trail");

  if (isTrailShoe && usedForRoadRace && shoe.surface === "trail") {
    return {
      level: "severe",
      message: "This is a trail shoe with lugs designed for dirt and mud. The aggressive tread will work against you on smooth pavement and feel uncomfortable."
    };
  }

  // Check 4: Road race shoe used for trails
  const isRoadRaceShoe = shoe.surface === "road" && archetypes.includes("race_shoe");
  const usedForTrail = userRunTypes.includes("trail");

  if (isRoadRaceShoe && usedForTrail) {
    return {
      level: "severe",
      message: "This is a road race shoe with minimal grip and no protection. It's dangerous on trails - you'll slip on loose terrain and risk injury."
    };
  }

  // Check 5: Heavy shoe (>290g) used for workouts
  const isHeavyShoe = shoe.weight_g > 290;
  const usedForWorkouts = userRunTypes.includes("workouts");

  if (isHeavyShoe && usedForWorkouts && !archetypes.includes("workout_shoe")) {
    return {
      level: "severe",
      message: `This is a heavy, max-cushion shoe (${shoe.weight_g}g). It's not designed for speed work and the extra weight will slow you down.`
    };
  }

  // Check 6: Carbon-plated workout shoe used only for recovery
  const isPlatedWorkoutShoe = shoe.has_plate && archetypes.includes("workout_shoe") && !archetypes.includes("race_shoe");
  const usedOnlyForRecovery = userRunTypes.includes("recovery") && userRunTypes.length === 1;

  if (isPlatedWorkoutShoe && usedOnlyForRecovery) {
    return {
      level: "severe",
      message: "This is a plated workout shoe designed for faster efforts. Using it only for easy runs limits your natural movement when you need relaxed running."
    };
  }

  // Check 7: Suboptimal - Daily trainer for workouts when workout shoe exists
  const isDailyTrainerOnly = archetypes.includes("daily_trainer") && !archetypes.includes("workout_shoe");
  if (isDailyTrainerOnly && usedForWorkouts) {
    return {
      level: "suboptimal",
      message: "Your daily trainer handles workouts fine, but a workout shoe could make speed sessions feel snappier."
    };
  }

  // Check 8: Suboptimal - Daily trainer for races
  const usedForRaces = userRunTypes.includes("races");
  if (isDailyTrainerOnly && usedForRaces && !archetypes.includes("race_shoe")) {
    return {
      level: "suboptimal",
      message: "You can race in your daily trainer, but a race shoe could knock time off your finish."
    };
  }

  return { level: "good" };
}

