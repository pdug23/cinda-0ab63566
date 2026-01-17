import type { RaceTime as PickerRaceTime } from "@/contexts/ProfileContext";
import type { RaceTime as APIRaceTime } from "../../api/types";

const mapDistanceToApi = (
  distance: PickerRaceTime["distance"]
): APIRaceTime["distance"] => {
  if (distance === "13.1mi") return "half";
  if (distance === "26.2mi") return "marathon";
  return distance;
};

/**
 * Convert a picker race time (hours/minutes/seconds) into API format.
 * Per spec: timeMinutes = (hours * 60) + minutes
 */
export const buildAPIRaceTimeFromPicker = (
  raceTime: PickerRaceTime
): APIRaceTime => {
  return {
    distance: mapDistanceToApi(raceTime.distance),
    timeMinutes: (raceTime.hours || 0) * 60 + (raceTime.minutes || 0),
  };
};

/**
 * If we have the original picker input, always trust it and rebuild timeMinutes.
 * This protects against legacy/stale storage where timeMinutes was stored as hours.
 */
export const normalizeStoredRaceTimeForApi = (
  raceTime: APIRaceTime | undefined,
  raceTimeInput?: PickerRaceTime | null
): APIRaceTime | undefined => {
  if (raceTimeInput) return buildAPIRaceTimeFromPicker(raceTimeInput);
  return raceTime;
};
