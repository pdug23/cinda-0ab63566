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
  | "experienced"
  | "competitive";

/**
 * Primary goal driving the runner's shoe selection
 */
export type PrimaryGoal =
  | "general_fitness"
  | "get_faster"
  | "race_training"
  | "injury_comeback";

/**
 * Typical running pattern and training structure
 */
export type RunningPattern =
  | "infrequent"
  | "mostly_easy"
  | "structured_training"
  | "workout_focused";

/**
 * Trail running preference
 */
export type TrailRunningPreference =
  | "most_or_all"
  | "infrequently"
  | "want_to_start"
  | "no_trails";

/**
 * Foot strike pattern
 */
export type FootStrike =
  | "forefoot"
  | "midfoot"
  | "heel"
  | "unsure";

/**
 * Slider value for feel preferences (1-5 scale)
 * Scales match shoebase.json scoring for direct comparison
 * - cushionAmount: 1 = minimal stack, 5 = max stack/cushion
 * - stabilityAmount: 1 = neutral, 5 = stable
 * - energyReturn: 1 = damped, 5 = bouncy
 * 
 * Can be a single value or an array to support flexible matching ranges
 */
export type FeelPreference = number | number[];

/**
 * Personal best time as a string (e.g., "5:30", "21:45", "3:45:22")
 */
export type PersonalBest = string;

/**
 * Race time entry for pace bucket calculation
 */
export interface RaceTime {
  distance: "5k" | "10k" | "half" | "marathon";
  timeMinutes: number;
}

/**
 * Brand preference configuration
 */
export interface BrandPreference {
  mode: "all" | "include" | "exclude";
  brands: string[];
}

/**
 * Complete runner profile collected through quiz and profile UI
 * NOTE: Feel preferences are now specified per-request (shopping mode) or per-gap (analysis mode)
 * Global feel preferences removed from profile to support mode-specific preferences
 */
export interface RunnerProfile {
  // Basic info
  firstName: string;
  age?: number;
  height?: { value: number; unit: "cm" | "in" };
  weight?: { value: number; unit: "kg" | "lb" };

  // Core profile
  experience: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  runningPattern?: RunningPattern;
  trailRunning?: TrailRunningPreference;

  // Weekly training volume
  weeklyVolume?: {
    value: number;
    unit: "km" | "mi";
  };

  // Performance context
  raceTime?: RaceTime;
  footStrike?: FootStrike;

  // Brand preferences
  brandPreference?: BrandPreference;

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
 * Run type - what the user DOES with this shoe
 * Maps to shoe archetypes via RUN_TYPE_MAPPING
 */
export type RunType =
  | "all_runs"
  | "recovery"
  | "long_runs"
  | "workouts"
  | "races"
  | "trail";

/**
 * Shoe archetype - what the shoe IS
 * Stored in shoebase.json as is_* boolean columns
 */
export type ShoeArchetype =
  | "daily_trainer"
  | "recovery_shoe"
  | "workout_shoe"
  | "race_shoe"
  | "trail_shoe";

/**
 * Legacy ShoeRole type for backwards compatibility
 * @deprecated Use RunType for user input, ShoeArchetype for shoe classification
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
 * Runner's sentiment about this shoe (3 values)
 */
export type ShoeSentiment =
  | "love"
  | "neutral"
  | "dislike";

/**
 * Tags for what runner loves about a shoe
 */
export type LoveTag =
  | "bouncy"
  | "soft_cushion"
  | "lightweight"
  | "stable"
  | "smooth_rocker"
  | "long_run_comfort"
  | "fast_feeling"
  | "comfortable_fit"
  | "good_grip";

/**
 * Tags for what runner dislikes about a shoe
 */
export type DislikeTag =
  | "too_heavy"
  | "too_soft"
  | "too_firm"
  | "unstable"
  | "blisters"
  | "too_narrow"
  | "too_wide"
  | "wears_fast"
  | "causes_pain"
  | "slow_at_speed";

/**
 * A shoe currently in the runner's rotation
 */
export interface CurrentShoe {
  shoeId: string; // References shoe_id from shoebase.json
  runTypes: RunType[]; // What the user uses this shoe for
  sentiment: ShoeSentiment;
  loveTags?: LoveTag[]; // What they love (if sentiment = love)
  dislikeTags?: DislikeTag[]; // What they dislike (if sentiment = dislike)
  usageFrequency?: UsageFrequency;
  lifecycle?: ShoeLifecycle;
  note?: string; // Optional runner comment
}

// ============================================================================
// ROTATION ANALYSIS TYPES
// ============================================================================

/**
 * Analysis of the runner's current shoe rotation
 */
export interface RotationAnalysis {
  // Coverage analysis (now uses RunType)
  coveredRunTypes: RunType[];
  uncoveredRunTypes: RunType[];

  // Archetype coverage
  coveredArchetypes: ShoeArchetype[];
  missingArchetypes: ShoeArchetype[];

  // Redundancy detection
  redundancies: Array<{
    shoeIds: string[];
    overlappingRunTypes: RunType[];
  }>;

  // Quality signals
  allShoesLoved: boolean;
  hasDislikedShoes: boolean;
  hasNearReplacementShoes: boolean;
}

/**
 * Internal rotation health score - drives recommendation tiers and AI summaries
 * Not displayed directly to users
 */
export interface RotationHealth {
  coverage: number;       // 0-100: has shoes for expected archetypes
  variety: number;        // 0-100: range across feel dimensions
  loadResilience: number; // 0-100: enough shoes for volume
  goalAlignment: number;  // 0-100: rotation supports stated goal
  overall: number;        // weighted average
}

// ============================================================================
// TIER CLASSIFICATION TYPES
// ============================================================================

/**
 * Recommendation tier based on rotation health
 * Tier 1: Genuine gaps - missing something important
 * Tier 2: Improvements - covered but could be better
 * Tier 3: Exploration - solid rotation, try something different
 */
export type RecommendationTier = 1 | 2 | 3;

/**
 * Confidence level for recommendations
 * Matches tier: Tier 1 = high, Tier 2 = medium, Tier 3 = soft
 */
export type RecommendationConfidence = "high" | "medium" | "soft";

/**
 * Feel gap detected in rotation analysis
 * Used to override "Let Cinda decide" preferences with smart defaults
 */
export interface FeelGapInfo {
  dimension: 'cushion' | 'drop' | 'rocker' | 'stability' | 'bounce';
  suggestion: 'low' | 'high';
  targetValue: number;  // Target value for this dimension (e.g., 5 for max cushion)
}

/**
 * Average feel profile of current rotation
 * Used to favor shoes that DIFFER from what the user already has (variety mode)
 */
export interface ContrastProfile {
  cushion?: number;
  stability?: number;
  bounce?: number;
  rocker?: number;
  groundFeel?: number;
}

/**
 * A single recommendation slot (primary or secondary)
 */
export interface RecommendationSlot {
  archetype: ShoeArchetype;
  reason: string;  // Why this archetype is recommended
  feelGap?: FeelGapInfo;  // Optional: feel gap that drove this recommendation
  contrastWith?: ContrastProfile;  // Optional: favor shoes different from this profile (variety mode)
}

/**
 * Result of tier classification
 */
export interface TierClassification {
  tier: RecommendationTier;
  confidence: RecommendationConfidence;
  primary: RecommendationSlot;
  secondary?: RecommendationSlot;  // Optional second recommendation
  tierReason: string;  // Why this tier was chosen (for debugging/summary)
}

/**
 * AI-generated rotation summary for display to user
 */
export interface RotationSummaryProse {
  prose: string;              // 2-3 sentence summary of their rotation
  strengths: string[];        // What's good about their rotation (1-3 items)
  improvements: string[];     // What could be better (0-3 items)
}

/**
 * Complete analysis result for gap_detection mode (Epic 6c structure)
 */
export interface AnalysisResult {
  // AI-generated summary
  rotationSummary: RotationSummaryProse;

  // Tiered recommendation
  recommendations: {
    tier: RecommendationTier;
    confidence: RecommendationConfidence;
    primary: RecommendationSlot;
    secondary?: RecommendationSlot;
  };

  // Internal health scores (for debugging, not displayed directly)
  health: RotationHealth;

  // Per-shoe breakdown (existing, keep for compatibility)
  shoeBreakdown: RotationSummary[];
}

// ============================================================================
// GAP DETECTION TYPES
// ============================================================================

/**
 * Type of gap identified in the rotation
 * - coverage: Missing coverage for a run type (all_runs, workouts, races, etc.)
 * - performance: All shoes are liked but missing speed/efficiency capability
 * - recovery: Missing soft/protective option for easy/long runs
 * - redundancy: Multiple shoes doing the same job, opportunity to diversify
 * - misuse: Using shoes for runs they're not designed for
 */
export type GapType =
  | "coverage"
  | "performance"
  | "recovery"
  | "redundancy"
  | "misuse";

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
  runType?: RunType; // The run type that's not covered
  recommendedArchetype?: ShoeArchetype; // The archetype to fill the gap
  redundantShoes?: string[]; // Shoe IDs if gap is redundancy
}

export type MisuseLevel = "severe" | "suboptimal" | "good";

export interface RotationSummary {
  shoe: Shoe;
  userRunTypes: RunType[];
  archetypes: ShoeArchetype[];
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
 * Heel geometry type
 */
export type HeelGeometry = "standard" | "aggressive_forefoot";

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

  // Archetype booleans
  is_daily_trainer: boolean;
  is_recovery_shoe: boolean;
  is_workout_shoe: boolean;
  is_race_shoe: boolean;
  is_trail_shoe: boolean;
  is_walking_shoe: boolean;
  is_super_trainer: boolean;

  // Known fit/durability issues
  common_issues: string[];

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
  heel_geometry: HeelGeometry;

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
 * Badge type for visual display (center-emphasis layout)
 * - closest_match: Best match (always center position, only one)
 * - close_match: Good alternative
 * - trade_off: Different approach with trade-offs
 */
export type RecommendationBadge = "closest_match" | "close_match" | "trade_off";

/**
 * Position in 3-card layout (center-emphasis)
 */
export type RecommendationPosition = "left" | "center" | "right";

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
  weight_feel_1to5: 1 | 2 | 3 | 4 | 5;
  heel_drop_mm: number;
  has_plate: boolean;
  plate_material: PlateMaterial;
  retail_price_category: RetailPriceCategory;
  release_status: ReleaseStatus;

  // Feel summary
  cushion_softness_1to5: 1 | 2 | 3 | 4 | 5;
  bounce_1to5: 1 | 2 | 3 | 4 | 5;
  stability_1to5: 1 | 2 | 3 | 4 | 5;

  // Recommendation context
  recommendationType: RecommendationBadge; // Now uses same values as badge
  matchReason: string[]; // Two bullet points: why it's good for role, what's notable
  keyStrengths: string[]; // 2-3 key selling points
  tradeOffs?: string[]; // What runner gives up with this choice

  // Archetype badges (which types this shoe is)
  archetypes: ShoeArchetype[];
  is_super_trainer: boolean; // Flag for super trainer versatility badge

  // Badge system (center-emphasis layout)
  badge: RecommendationBadge;
  position: RecommendationPosition;
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
 * Preference value with 3-mode system:
 * - cinda_decides: Cinda uses role-based intelligent defaults
 * - user_set: User explicitly sets their preference (1-5 scale)
 * - wildcard: Skip this dimension in scoring entirely
 */
export interface PreferenceValue {
  mode: "cinda_decides" | "user_set" | "wildcard";
  value?: 1 | 2 | 3 | 4 | 5;  // Only present if mode === "user_set"
}

/**
 * Heel drop preference with multi-select option
 */
export interface HeelDropPreference {
  mode: "cinda_decides" | "user_set" | "wildcard";
  values?: ("0mm" | "1-4mm" | "5-8mm" | "9-12mm" | "12mm+")[];  // Only present if mode === "user_set"
}

/**
 * Feel preferences for shoe recommendations with 3-mode system
 * All fields are REQUIRED but each has a mode to control behavior
 * Default mode for all is "cinda_decides"
 */
export interface FeelPreferences {
  cushionAmount: PreferenceValue;    // 1 = minimal stack, 5 = max cushion
  stabilityAmount: PreferenceValue;  // 1 = neutral, 5 = stable
  energyReturn: PreferenceValue;     // 1 = damped, 5 = bouncy
  rocker: PreferenceValue;           // 1 = flat/minimal, 5 = aggressive rocker
  groundFeel: PreferenceValue;       // 1 = isolated/cushioned, 5 = high ground feel
  stackHeight: PreferenceValue;      // 1 = grounded/minimal, 5 = max stack (inverse of groundFeel)
  heelDropPreference: HeelDropPreference;
}

/**
 * Represents a request for a specific shoe archetype with preferences (discovery mode)
 */
export interface ShoeRequest {
  archetype: ShoeArchetype;
  feelPreferences: FeelPreferences;
  feelGap?: FeelGapInfo; // Optional: feel gap from rotation analysis to guide "cinda_decides" preferences
  contrastWith?: ContrastProfile; // Optional: favor shoes different from current rotation (variety mode)
}

/**
 * Result for a single discovery request
 */
export interface ShoppingResult {
  archetype: ShoeArchetype;
  recommendations: RecommendedShoe[]; // 2-3 shoes per archetype
  reasoning: string;
}

/**
 * Request to analyze rotation and generate recommendations
 * Supports three modes: gap_detection, discovery, analysis
 */
export interface AnalyzeRequest {
  profile: RunnerProfile;
  currentShoes: CurrentShoe[];
  mode: "gap_detection" | "discovery" | "analysis";

  // Discovery mode fields (when mode === "discovery")
  requestedArchetypes?: ShoeArchetype[]; // Which archetypes to search for
  shoeRequests?: ShoeRequest[]; // Alternative: 1-3 shoe requests with archetype + preferences each

  // Analysis mode fields (when mode === "analysis")
  gap?: Gap; // Pre-identified gap from gap_detection call
  feelPreferences?: FeelPreferences; // Preferences for the identified gap

  // Chat context (extracted from chat step, affects scoring)
  chatContext?: ChatContext;

  // Optional constraints (all modes) - note: brandOnly moved to profile.brandPreference
  constraints?: {
    stabilityPreference?: "neutral_only" | "stability_only" | "no_preference";
  };
}

/**
 * Response from analyze endpoint
 * Structure depends on the mode
 */
export interface AnalyzeResponse {
  success: boolean;
  mode?: "gap_detection" | "discovery" | "analysis";
  result?: {
    // Gap detection mode (Epic 6c)
    analysis?: AnalysisResult;

    // Legacy gap detection fields (keep for backwards compatibility)
    gap?: Gap;
    rotationSummary?: RotationSummary[];

    // Discovery mode
    discoveryResults?: ShoppingResult[];

    // Analysis mode (post-gap recommendations)
    recommendations?: RecommendedShoe[];
    summaryReasoning?: string;
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

// ============================================================================
// CHAT CONTEXT TYPES (extracted from chat step)
// ============================================================================

/**
 * Injury extracted from chat conversation
 */
export interface ChatInjury {
  injury: string;          // e.g., "shin splints", "plantar fasciitis"
  trigger?: string;        // e.g., "speed work", "long runs"
  current: boolean;        // Is this a current injury?
}

/**
 * Past shoe sentiment from chat
 */
export interface ChatPastShoe {
  shoe?: string;           // Specific shoe name if mentioned
  brand?: string;          // Brand if mentioned
  sentiment: "loved" | "liked" | "neutral" | "disliked" | "hated";
  reason?: string;         // Why they felt this way
}

/**
 * Fit information from chat
 */
export interface ChatFit {
  width?: "narrow" | "standard" | "wide" | "extra_wide";
  volume?: "low" | "standard" | "high";
  issues?: string[];       // e.g., ["heel slippage", "toe cramping"]
}

/**
 * Context extracted from chat conversation
 * Affects scoring and filtering in recommendations
 */
export interface ChatContext {
  injuries?: ChatInjury[];
  pastShoes?: ChatPastShoe[];
  fit?: ChatFit;
  climate?: string;        // e.g., "hot and humid", "wet", "cold"
  requests?: string[];     // e.g., ["lightweight", "good for long runs"]
}

// ============================================================================
// RUN TYPE TO ARCHETYPE MAPPING
// ============================================================================

/**
 * Maps run types (what user does) to suitable shoe archetypes (what shoe is)
 * Priority order: first archetype in array is preferred
 */
export const RUN_TYPE_MAPPING: Record<RunType, ShoeArchetype[]> = {
  "all_runs": ["daily_trainer"],
  "recovery": ["recovery_shoe", "daily_trainer"],
  "long_runs": ["daily_trainer", "workout_shoe", "recovery_shoe"],
  "workouts": ["workout_shoe", "race_shoe"],
  "races": ["race_shoe", "workout_shoe"],
  "trail": ["trail_shoe"]
};

/**
 * Maps archetype to the corresponding is_* field in shoebase.json
 */
export const ARCHETYPE_FIELD_MAP: Record<ShoeArchetype, keyof Shoe> = {
  "daily_trainer": "is_daily_trainer",
  "recovery_shoe": "is_recovery_shoe",
  "workout_shoe": "is_workout_shoe",
  "race_shoe": "is_race_shoe",
  "trail_shoe": "is_trail_shoe"
};

/**
 * Helper to check if a shoe has a specific archetype
 * Now uses actual boolean values from shoebase.json
 */
export function shoeHasArchetype(shoe: Shoe, archetype: ShoeArchetype): boolean {
  const field = ARCHETYPE_FIELD_MAP[archetype];
  return shoe[field] === true;
}

/**
 * Get all archetypes a shoe belongs to
 */
export function getShoeArchetypes(shoe: Shoe): ShoeArchetype[] {
  const archetypes: ShoeArchetype[] = [];
  if (shoeHasArchetype(shoe, "daily_trainer")) archetypes.push("daily_trainer");
  if (shoeHasArchetype(shoe, "recovery_shoe")) archetypes.push("recovery_shoe");
  if (shoeHasArchetype(shoe, "workout_shoe")) archetypes.push("workout_shoe");
  if (shoeHasArchetype(shoe, "race_shoe")) archetypes.push("race_shoe");
  if (shoeHasArchetype(shoe, "trail_shoe")) archetypes.push("trail_shoe");
  return archetypes;
}

/**
 * Check if a shoe is suitable for a specific run type
 */
export function shoeIsSuitableFor(shoe: Shoe, runType: RunType): boolean {
  const suitableArchetypes = RUN_TYPE_MAPPING[runType];
  return suitableArchetypes.some(archetype => shoeHasArchetype(shoe, archetype));
}
