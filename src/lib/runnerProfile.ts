// src/lib/runnerProfile.ts

export type Source = "explicit" | "inferred" | null;
export type Confidence = "low" | "medium" | "high" | null;

export type ProfileField<T> = {
  value: T | null;
  source: Source;
  confidence: Confidence;
  updatedAt: string | null;
  raw: string | null;
};

const emptyField = <T,>(): ProfileField<T> => ({
  value: null,
  source: null,
  confidence: null,
  updatedAt: null,
  raw: null,
});

export type StabilityNeed =
  | "neutral"
  | "mild_stability"
  | "stability"
  | "max_stability"
  | null;

export type FootWidthVolume =
  | "narrow_low_volume"
  | "standard"
  | "wide"
  | "high_volume"
  | null;

export type CushioningPreference =
  | "soft_plush"
  | "balanced"
  | "firm_responsive"
  | "unsure"
  | null;

export type ExperienceLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "returning"
  | "unknown"
  | null;

export type ShoePurpose =
  | "daily_trainer"
  | "easy_recovery"
  | "long_run"
  | "tempo_workout"
  | "speed_intervals"
  | "race"
  | "trail"
  | "walking_all_day"
  | "unsure"
  | null;

export type ShoeFeedbackItem = {
  raw_text: string;
  display_name: string | null;
  brand: string | null;
  canonical_model: string | null;
  version: string | null;
  reasons: string[];
  match_confidence: "low" | "medium" | "high";
  updatedAt: string | null;
};

export type RunnerProfile = {
  profileCore: {
    stabilityNeed: ProfileField<StabilityNeed>;
    footWidthVolume: ProfileField<FootWidthVolume>;
    cushioningPreference: ProfileField<CushioningPreference>;
    experienceLevel: ProfileField<ExperienceLevel>;
    // We’ll add the rest (mileage, surfaces, etc) later.
  };
  currentContext: {
    shoePurpose: ProfileField<ShoePurpose>;
    notes: string;
  };
  shoeFeedback: {
    dislikes: ShoeFeedbackItem[];
    likes: ShoeFeedbackItem[];
  };
};

export const createEmptyRunnerProfile = (): RunnerProfile => ({
  profileCore: {
    stabilityNeed: emptyField<StabilityNeed>(),
    footWidthVolume: emptyField<FootWidthVolume>(),
    cushioningPreference: emptyField<CushioningPreference>(),
    experienceLevel: emptyField<ExperienceLevel>(),
  },
  currentContext: {
    shoePurpose: emptyField<ShoePurpose>(),
    notes: "",
  },
  shoeFeedback: {
    dislikes: [],
    likes: [],
  },
});
