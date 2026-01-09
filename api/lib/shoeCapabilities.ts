import type { Shoe, ShoeRole } from '../types.js';

export function getShoeCapabilities(shoe: Shoe): ShoeRole[] {
    const capabilities: ShoeRole[] = [];
    if (shoe.use_daily) capabilities.push("daily");
    if (shoe.use_easy_recovery) capabilities.push("easy");
    if (shoe.use_tempo_workout) capabilities.push("tempo");
    if (shoe.use_speed_intervals) capabilities.push("intervals");
    if (shoe.use_race) capabilities.push("race");
    if (shoe.use_trail) capabilities.push("trail");
    return capabilities;
}

export type MisuseLevel = "severe" | "suboptimal" | "good";

export function detectMisuse(
    userRoles: ShoeRole[],
    capabilities: ShoeRole[],
    shoe: Shoe
): { level: MisuseLevel; message?: string } {

    // Check 1: Race shoe used for daily/recovery
    const isRaceShoe = capabilities.includes("race") && !capabilities.includes("daily");
    const usedForEasy = userRoles.includes("daily") || userRoles.includes("easy");

    if (isRaceShoe && usedForEasy) {
        return {
            level: "severe",
            message: "This is a race-day shoe with a carbon plate. Using it daily will wear it out quickly and you're not getting the benefit it's designed for."
        };
    }

    // Check 2: Recovery shoe used for races/speed
    const isRecoveryShoe = !capabilities.includes("race") &&
        !capabilities.includes("tempo") &&
        (capabilities.includes("easy") || shoe.cushion_softness_1to5 >= 4);
    const usedForRace = userRoles.includes("race") || userRoles.includes("intervals");

    if (isRecoveryShoe && usedForRace) {
        return {
            level: "severe",
            message: "This is a recovery shoe with soft cushioning. It's not designed for the demands of racing or speed work and could slow you down."
        };
    }

    // Check 3: Trail shoe used for road races
    const isTrailShoe = shoe.surface === "trail" || shoe.surface === "mixed";
    const usedForRoadRace = userRoles.includes("race") && !userRoles.includes("trail");

    if (isTrailShoe && usedForRoadRace && shoe.surface === "trail") {
        return {
            level: "severe",
            message: "This is a trail shoe with lugs designed for dirt and mud. The aggressive tread will work against you on smooth pavement and feel uncomfortable."
        };
    }

    // Check 4: Road race shoe used for trails
    const isRoadRaceShoe = shoe.surface === "road" && capabilities.includes("race");
    const usedForTrail = userRoles.includes("trail");

    if (isRoadRaceShoe && usedForTrail) {
        return {
            level: "severe",
            message: "This is a road race shoe with minimal grip and no protection. It's dangerous on trails - you'll slip on loose terrain and risk injury."
        };
    }

    // Check 5: Heavy shoe (>290g) used for speed intervals
    const isHeavyShoe = shoe.weight_g > 290;
    const usedForIntervals = userRoles.includes("intervals");

    if (isHeavyShoe && usedForIntervals && !capabilities.includes("intervals")) {
        return {
            level: "severe",
            message: `This is a heavy, max-cushion shoe (${shoe.weight_g}g). It's not designed for speed work and the extra weight will slow you down on the track.`
        };
    }

    // Check 6: Carbon-plated tempo shoe used only for easy runs
    const isPlatedTempoShoe = shoe.has_plate && capabilities.includes("tempo") && !capabilities.includes("race");
    const usedOnlyForEasy = userRoles.includes("easy") && userRoles.length === 1;

    if (isPlatedTempoShoe && usedOnlyForEasy) {
        return {
            level: "severe",
            message: "This is a plated tempo shoe designed for faster efforts. Using it only for easy runs limits your natural movement when you need relaxed running."
        };
    }

    return { level: "good" };
}

