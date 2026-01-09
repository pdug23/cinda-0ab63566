// ============================================================================
// CINDA TYPE DEFINITIONS
// Comprehensive TypeScript types for the recommendation engine
// ============================================================================

// ============================================================================
// RUNNER PROFILE TYPES
// ============================================================================

/**
 * Runner's self-reported experience level with running
 */
export type ExperienceLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "racing_focused";

/**
 * Primary goal driving the runner's shoe selection
 */
export type PrimaryGoal =
  | "general_fitness"
  | "improve_pace"
  | "train_for_race"
  | "comfort_recovery"
  | "just_for_fun";

/**
 * Typical running pattern and training structure
 */
export type RunningPattern =
  | "infrequent"
  | "mostly_easy"
  | "structured_training"
  | "workouts"
  | "long_run_focus";

/**
 * Slider value for feel preferences (1-5 scale)
 * Scales match shoebase.json scoring for direct comparison
 * - softVsFirm: 5 = very soft, 1 = very firm
 * - stableVsNeutral: 5 = very stable, 1 = neutral/minimal
 * - bouncyVsDamped: 5 = very bouncy/responsive, 1 = damped/smooth
 * 
 * Can be a single value or an array to support flexible matching ranges
 */
export type FeelPreference = number | number[];

/**
 * Personal best time as a string (e.g., "5:30", "21:45", "3:45:22")
 */
export type PersonalBest = string;

/**
 * Complete runner profile collected through quiz and profile UI
 * NOTE: Feel preferences are now specified per-request (shopping mode) or per-gap (analysis mode)
 * Global feel preferences removed from profile to support mode-specific preferences
 */
export interface RunnerProfile {
  // Basic info
  firstName: string;
  age?: number;
  height?: number; // cm
  weight?: number; // kg

  // Optional performance context
  pbs?: {
    mile?: PersonalBest;
    fiveK?: PersonalBest;
    tenK?: PersonalBest;
    half?: PersonalBest;
    marathon?: PersonalBest;
  };

  // Core profile
  experience: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  runningPattern?: RunningPattern;

  // Optional fit sensitivities
  fitSensitivities?: {
    needsWideWidth?: boolean;
    needsNarrowWidth?: boolean;
    highArchSupport?: boolean;
    lowArch?: boolean;
    wideToeBox?: boolean;
  };

  // Optional niggles (non-medical context only)
  currentNiggles?: string[];
}

// ============================================================================
// CURRENT SHOES TYPES
// ============================================================================

/**
 * Role a shoe plays in the runner's rotation
 */
export type ShoeRole =
  | "easy"
  | "daily"
  | "long"
  | "tempo"
  | "intervals"
  | "race"
  | "trail";

/**
 * How often the runner uses this shoe
 */
export type UsageFrequency =
  | "rarely"
  | "sometimes"
  | "often"
  | "most_runs";

/**
 * Current lifecycle stage of the shoe
 */
export type ShoeLifecycle =
  | "new"
  | "mid_life"
  | "near_replacement";

/**
 * Runner's sentiment about this shoe
 */
export type ShoeSentiment =
  | "like"
  | "neutral"
  | "dislike";

/**
 * A shoe currently in the runner's rotation
 */
export interface CurrentShoe {
  shoeId: string; // References shoe_id from shoebase.json
  roles: ShoeRole[]; // Can serve multiple roles
  usageFrequency?: UsageFrequency;
  lifecycle?: ShoeLifecycle;
  sentiment: ShoeSentiment;
  note?: string; // Optional runner comment
}

// ============================================================================
// ROTATION ANALYSIS TYPES
// ============================================================================

/**
 * Analysis of the runner's current shoe rotation
 */
export interface RotationAnalysis {
  // Coverage analysis
  coveredRoles: ShoeRole[];
  missingRoles: ShoeRole[];

  // Redundancy detection
  redundancies: Array<{
    shoeIds: string[];
    overlappingRoles: ShoeRole[];
  }>;

  // Quality signals
  allShoesLiked: boolean;
  hasDislikedShoes: boolean;
  hasNearReplacementShoes: boolean;
}

// ============================================================================
// GAP DETECTION TYPES
// ============================================================================

/**
 * Type of gap identified in the rotation
 * - coverage: Missing a key role (easy, tempo, long, etc.)
 * - performance: All shoes are liked but missing speed/efficiency capability
 * - recovery: Missing soft/protective option for easy/long runs
 * - redundancy: Multiple shoes doing the same job, opportunity to diversify
 */
export type GapType =
  | "coverage"
  | "performance"
  | "recovery"
  | "redundancy";

/**
 * Severity of the identified gap
 */
export type GapSeverity =
  | "low"
  | "medium"
  | "high";

/**
 * Identified gap in the runner's rotation
 */
export interface Gap {
  type: GapType;
  severity: GapSeverity;
  reasoning: string; // Human-readable explanation
  missingCapability?: ShoeRole | string; // What's missing (role or capability description)
  redundantShoes?: string[]; // Shoe IDs if gap is redundancy
}

export type MisuseLevel = "severe" | "suboptimal" | "good";

export interface RotationSummary {
  shoe: Shoe;
  userRoles: ShoeRole[];
  capabilities: ShoeRole[];
  misuseLevel: MisuseLevel;
  misuseMessage?: string;
}

// ============================================================================
// SHOEBASE.JSON STRUCTURE
// ============================================================================

/**
 * Fit volume options
 */
export type FitVolume =
  | "standard"
  | "roomy"
  | "snug"
  | "narrow";

/**
 * Toe box shape/width
 */
export type ToeBox =
  | "standard"
  | "wide"
  | "narrow"
  | "roomy";

/**
 * Width options available
 */
export type WidthOptions =
  | "standard only"
  | "standard and wide"
  | "standard, wide, and narrow"
  | "wide only";

/**
 * Support/stability type
 */
export type SupportType =
  | "neutral"
  | "stable_neutral"
  | "stability"
  | "max_stability";

/**
 * Primary surface type
 */
export type Surface =
  | "road"
  | "trail"
  | "track"
  | "mixed";

/**
 * Wet grip performance
 */
export type WetGrip =
  | "poor"
  | "average"
  | "good"
  | "excellent";

/**
 * Release/availability status
 */
export type ReleaseStatus =
  | "available"
  | "coming_soon"
  | "discontinued"
  | "regional";

/**
 * Retail price category
 */
export type RetailPriceCategory =
  | "Budget"
  | "Core"
  | "Premium"
  | "Race_Day";

/**
 * Plate material (if shoe has a plate)
 */
export type PlateMaterial =
  | "carbon"
  | "pebax"
  | "nylon"
  | "TPU"
  | null;

/**
 * Quarter of year (for release timing)
 */
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

/**
 * Complete shoe record from shoebase.json
 * Field names match the JSON structure exactly
 */
export interface Shoe {
  // Identity
  shoe_id: string;
  brand: string;
  model: string;
  version: string | null;
  full_name: string;
  alias_code: string | null;

  // Use case booleans
  use_daily: boolean;
  use_easy_recovery: boolean;
  use_long_run: boolean;
  use_tempo_workout: boolean;
  use_speed_intervals: boolean;
  use_race: boolean;
  use_trail: boolean;
  use_walking_all_day: boolean;

  // Feel scores (1-5 scale from shoebase.json)
  /** 5 = very soft/plush, 1 = very firm */
  cushion_softness_1to5: 1 | 2 | 3 | 4 | 5;
  /** 5 = very bouncy/energetic, 1 = very damped/dead */
  bounce_1to5: 1 | 2 | 3 | 4 | 5;
  /** 5 = very stable/planted, 1 = neutral/tippy */
  stability_1to5: 1 | 2 | 3 | 4 | 5;
  /** 5 = aggressive rocker, 1 = flat/minimal rocker */
  rocker_1to5: 1 | 2 | 3 | 4 | 5;
  /** 5 = high ground feel/direct, 1 = isolated/cushioned */
  ground_feel_1to5: 1 | 2 | 3 | 4 | 5;
  /** 5 = feels heavy on foot, 1 = feels light */
  weight_feel_1to5: 1 | 2 | 3 | 4 | 5;

  // Specs
  weight_g: number;
  heel_drop_mm: number;
  has_plate: boolean;
  plate_tech_name: string | null;
  plate_material: PlateMaterial;

  // Fit
  fit_volume: FitVolume;
  toe_box: ToeBox;
  width_options: WidthOptions;
  support_type: SupportType;

  // Meta
  surface: Surface;
  wet_grip: WetGrip;
  release_status: ReleaseStatus;
  release_year: number;
  release_quarter: Quarter;
  retail_price_category: RetailPriceCategory;

  // Descriptions
  why_it_feels_this_way: string;
  avoid_if: string;
  similar_to: string;
  notable_detail: string;
}

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

/**
 * Type of recommendation in the 3-shoe pattern
 * - close_match: Primary recommendation (position 1)
 * - close_match_2: Secondary close match (position 2)
 * - trade_off_option: Alternative with different trade-offs (position 3)
 */
export type RecommendationType =
  | "close_match"
  | "close_match_2"
  | "trade_off_option";

/**
 * A recommended shoe with reasoning
 * Combines shoe data from catalogue with recommendation context
 */
export interface RecommendedShoe {
  // Core shoe data (from shoebase.json)
  shoeId: string;
  fullName: string;
  brand: string;
  model: string;
  version: string | null;

  // Relevant specs for display
  weight_g: number;
  heel_drop_mm: number;
  has_plate: boolean;
  retail_price_category: RetailPriceCategory;
  release_status: ReleaseStatus;

  // Feel summary
  cushion_softness_1to5: 1 | 2 | 3 | 4 | 5;
  bounce_1to5: 1 | 2 | 3 | 4 | 5;
  stability_1to5: 1 | 2 | 3 | 4 | 5;

  // Recommendation context
  recommendationType: RecommendationType;
  matchReason: string; // Why this shoe fills the gap
  keyStrengths: string[]; // 2-3 key selling points
  tradeOffs?: string; // What runner gives up with this choice (especially for trade_off_option)
}

/**
 * Complete recommendation result from analysis
 */
export interface RecommendationResult {
  gap: Gap;
  recommendations: [RecommendedShoe, RecommendedShoe, RecommendedShoe]; // Always exactly 3
  summaryReasoning: string; // Overall explanation of the gap and recommendation strategy
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Feel preferences for shoe recommendations (1-5 scale)
 * Extracted from RunnerProfile to allow per-request/per-gap customization
 */
export interface FeelPreferences {
  softVsFirm: FeelPreference;       // 5 = very soft, 1 = very firm
  stableVsNeutral: FeelPreference;  // 5 = very stable, 1 = neutral
  bouncyVsDamped: FeelPreference;   // 5 = very bouncy, 1 = damped
}

/**
 * Represents a request for a specific shoe type with preferences (shopping mode)
 */
export interface ShoeRequest {
  role: ShoeRole;
  feelPreferences: FeelPreferences;
}

/**
 * Result for a single shopping request
 */
export interface ShoppingResult {
  role: ShoeRole;
  recommendations: RecommendedShoe[]; // 2-3 shoes per role
  reasoning: string;
}

/**
 * Request to analyze rotation and generate recommendations
 * Supports three modes: gap_detection, shopping, analysis
 */
export interface AnalyzeRequest {
  profile: RunnerProfile; // Basic info only (no global feelPreferences)
  currentShoes: CurrentShoe[];
  mode: "gap_detection" | "shopping" | "analysis";

  // Shopping mode fields (when mode === "shopping")
  shoeRequests?: ShoeRequest[]; // 1-3 shoe requests with role + preferences each

  // Analysis mode fields (when mode === "analysis")
  gap?: Gap; // Pre-identified gap from gap_detection call
  feelPreferences?: FeelPreferences; // Preferences for the identified gap

  // Optional constraints (all modes)
  constraints?: {
    brandOnly?: string; // Limit to specific brand
    stabilityPreference?: "neutral_only" | "stability_only" | "no_preference";
    maxPrice?: RetailPriceCategory;
  };
}

/**
 * Response from analyze endpoint
 * Structure depends on the mode
 */
export interface AnalyzeResponse {
  success: boolean;
  mode?: "gap_detection" | "shopping" | "analysis";
  result?: {
    // Gap detection mode: just return the gap
    gap?: Gap;

    // Shopping mode: recommendations per requested role
    shoppingResults?: ShoppingResult[];

    // Analysis mode: gap + recommendations (existing pattern)
    recommendations?: RecommendedShoe[];
    summaryReasoning?: string;
    rotationSummary?: RotationSummary[];
  };
  error?: string;
}

/**
 * Chat message in conversation
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Request to chat endpoint for conversational explanation
 */
export interface ChatRequest {
  profile: RunnerProfile;
  currentShoes: CurrentShoe[];
  recommendations: RecommendedShoe[];
  gap: Gap;
  messages: ChatMessage[];
}

/**
 * Response from chat endpoint
 */
export interface ChatResponse {
  reply: string;
}
