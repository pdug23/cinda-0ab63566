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

  export type NegativeReasonTag =
  | "too_firm"
  | "too_soft"
  | "too_bouncy"
  | "too_mushy"
  | "too_dead"
  | "too_stiff"
  | "too_flexible"
  | "too_unstable"
  | "heel_slip"
  | "toe_box_too_narrow"
  | "midfoot_too_narrow"
  | "arch_pressure"
  | "blisters_hotspots"
  | "runs_short"
  | "runs_long";

export type Severity = 1 | 2 | 3; // 1=mild, 2=moderate, 3=strong avoid

export type BrandNegativeSignal = {
  brand: string;
  strength: Severity;
  reasons?: NegativeReasonTag[];
  updatedAt: string | null;
  raw: string | null;
};

export type FeatureNegativeSignal = {
  tag: NegativeReasonTag;
  strength: Severity;
  contexts?: ShoePurpose[];
  updatedAt: string | null;
  raw: string | null;
};

export type ShoeFeedbackItem = {
  raw_text: string;
  display_name: string | null;
  brand: string | null;
  canonical_model: string | null;
  version: string | null;
  reasons: NegativeReasonTag[];
  match_confidence: "low" | "medium" | "high";
  severity: Severity;
  contexts?: ShoePurpose[];
  updatedAt: string | null;
};


export type RunnerProfile = {
  profileCore: {
    stabilityNeed: ProfileField<StabilityNeed>;
    footWidthVolume: ProfileField<FootWidthVolume>;
    cushioningPreference: ProfileField<CushioningPreference>;
    experienceLevel: ProfileField<ExperienceLevel>;
  };
  currentContext: {
    shoePurpose: ProfileField<ShoePurpose>;
    notes: string;
  };
  negativeSignals: {
    brands: BrandNegativeSignal[];
    features: FeatureNegativeSignal[];
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
  negativeSignals: {
    brands: [],
    features: [],
  },
  shoeFeedback: {
    dislikes: [],
    likes: [],
  },
});
