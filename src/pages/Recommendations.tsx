import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ShoeCarousel } from "@/components/results/ShoeCarousel";
import { Button } from "@/components/ui/button";
import { LeaveRecommendationsModal } from "@/components/LeaveRecommendationsModal";
import { loadProfile, loadShoes, loadShoeRequests, loadGap, loadChatContext } from "@/utils/storage";
import { normalizeStoredRaceTimeForApi } from "@/utils/raceTime";
import type { FeelPreferences as APIFeelPreferences, CurrentShoe as APICurrentShoe } from "../../api/types";
import { LiquidMetalLoader } from "@/components/LiquidMetalLoader";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RecommendedShoe {
  shoeId: string;
  fullName: string;
  brand: string;
  model: string;
  version: string;
  weight_g?: number;
  weight_feel_1to5?: 1 | 2 | 3 | 4 | 5;
  heel_drop_mm: number;
  has_plate: boolean;
  plate_material: "Nylon" | "Plastic" | "Carbon" | null;
  cushion_softness_1to5?: number;
  bounce_1to5?: number;
  stability_1to5?: number;
  matchReason: string[];
  keyStrengths: string[];
  tradeOffs?: string[];
  similar_to?: string;
  recommendationType: "close_match" | "close_match_2" | "trade_off" | "trade_off_option";
  badge?: string;
  position?: number;
  archetypes?: string[]; // e.g. ["daily_trainer", "workout_shoe"]
  // Use case booleans for "also works for" popover
  use_daily?: boolean;
  use_easy_recovery?: boolean;
  use_tempo_workout?: boolean;
  use_speed_intervals?: boolean;
  use_race?: boolean;
  use_trail?: boolean;
}

interface Gap {
  type: string;
  severity: string;
  reasoning: string;
  missingCapability?: string;
  recommendedArchetype?: string;
}

interface RotationShoe {
  shoeId: string;
  fullName: string;
  brand: string;
  runTypes: string[];
  archetypes: string[];
  misuseLevel: 'good' | 'suboptimal' | 'severe';
  misuseReason?: string;
}

interface AnalysisResult {
  gap: Gap;
  recommendations: RecommendedShoe[];
  summaryReasoning: string;
  rotationSummary?: RotationShoe[];
}

interface DiscoveryResultItem {
  archetype: string;
  recommendations: RecommendedShoe[];
  reasoning: string;
}

interface DiscoveryResult {
  discoveryResults: DiscoveryResultItem[];
}

type Mode = "analysis" | "discovery";

// STORAGE_KEYS constant removed - using storage utilities instead

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function loadFromStorage<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function mapArchetypeToCarouselRole(archetype: string): "daily" | "tempo" | "race" | "easy" | "long" | "trail" {
  const archetypeMap: Record<string, "daily" | "tempo" | "race" | "easy" | "long" | "trail"> = {
    daily_trainer: "daily",
    daily: "daily",
    workout_shoe: "tempo",
    tempo: "tempo",
    race_shoe: "race",
    race: "race",
    recovery_shoe: "easy",
    recovery: "easy",
    easy: "easy",
    long: "long",
    trail_shoe: "trail",
    trail: "trail",
    not_sure: "daily",
  };
  return archetypeMap[archetype.toLowerCase()] || "daily";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const loadingMessages = [
  "bypassing the paid reviews...",
  "decoding the jargon...",
  "skipping the sponsored posts...",
  "cross-referencing the lab data...",
  "checking actual runner feedback...",
  "filtering out the hype...",
];

function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through loading messages every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-16 px-4">
      {/* Liquid Metal Animation */}
      <LiquidMetalLoader />

      {/* Rotating loading messages - refined typography */}
      <p 
        key={messageIndex}
        className="text-lg text-muted-foreground/60 font-light italic tracking-wide animate-fade-in"
      >
        {loadingMessages[messageIndex]}
      </p>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  onBack
}: {
  error: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const isInvalidRequest = error.includes("Invalid");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <p className="text-card-foreground/70 text-lg">
        {error}
      </p>
      <button
        onClick={isInvalidRequest ? onBack : onRetry}
        className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-medium min-h-[48px] w-full max-w-xs hover:opacity-90 transition-opacity"
      >
        {isInvalidRequest ? "Go back to profile" : "Retry"}
      </button>
    </div>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <p className="text-card-foreground/70 text-lg">
        No shoes match your criteria
      </p>
      <button
        onClick={onBack}
        className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-medium min-h-[48px] w-full max-w-xs hover:opacity-90 transition-opacity"
      >
        Adjust preferences
      </button>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
      aria-label="Try again"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      TRY AGAIN
    </button>
  );
}

function ProfileButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
      aria-label="Go to profile"
    >
      PROFILE
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

function PageHeader() {
  return (
    <div className="text-center py-0 px-5">
      <h1 className="text-xl font-bold text-card-foreground/90">
        Cinda's recommendations
      </h1>
    </div>
  );
}


// Helper to format archetype for display
function formatArchetype(archetype: string): string {
  const formatMap: Record<string, string> = {
    daily_trainer: 'daily trainer',
    recovery_shoe: 'recovery',
    workout_shoe: 'workout',
    race_shoe: 'race',
    trail_shoe: 'trail',
  };
  return formatMap[archetype] || archetype.replace(/_/g, ' ');
}

// Helper to get border color based on misuse level
function getMisuseBorderClass(level: 'good' | 'suboptimal' | 'severe'): string {
  switch (level) {
    case 'good': return 'border-green-500/60';
    case 'suboptimal': return 'border-amber-500/60';
    case 'severe': return 'border-red-500/60';
    default: return 'border-card-foreground/20';
  }
}

function AnalysisSummaryView({
  gap,
  rotationSummary,
  onSetPreferences,
}: {
  gap: Gap;
  rotationSummary: RotationShoe[];
  onSetPreferences: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-6 md:px-8 pb-6 gap-6 overflow-y-auto">
      {/* Rotation Summary */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-card-foreground/70 uppercase tracking-wider">
          your rotation
        </h2>
        <div className="space-y-3">
          {rotationSummary.map((shoe) => (
            <div
              key={shoe.shoeId}
              className={`p-4 rounded-xl bg-card-foreground/5 border-2 ${getMisuseBorderClass(shoe.misuseLevel)}`}
            >
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-card-foreground/90">
                  {shoe.fullName}
                </span>
                {/* Run types */}
                <div className="flex flex-wrap gap-1.5">
                  {shoe.runTypes.map((rt) => (
                    <span
                      key={rt}
                      className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary-foreground/80"
                    >
                      {rt.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                {/* Archetypes */}
                <div className="flex flex-wrap gap-1.5">
                  {shoe.archetypes.map((arch) => (
                    <span
                      key={arch}
                      className="px-2 py-0.5 text-xs rounded-full bg-card-foreground/10 text-card-foreground/70"
                    >
                      {formatArchetype(arch)}
                    </span>
                  ))}
                </div>
                {shoe.misuseReason && (
                  <p className="text-xs text-card-foreground/60 mt-1">
                    {shoe.misuseReason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gap Analysis */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-card-foreground/70 uppercase tracking-wider">
          recommendation
        </h2>
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-card-foreground/90 font-medium mb-2">
            you'd benefit from a {formatArchetype(gap.recommendedArchetype || gap.missingCapability || 'daily_trainer')}
          </p>
          <p className="text-sm text-card-foreground/70">
            {gap.reasoning}
          </p>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={onSetPreferences}
        variant="cta"
        className="w-full min-h-[48px] mt-2"
      >
        Set preferences
      </Button>
    </div>
  );
}

function AnalysisModeResults({
  result,
  gap,
  shortlistedShoes,
  onShortlist,
}: {
  result: AnalysisResult;
  gap: Gap;
  shortlistedShoes: string[];
  onShortlist: (shoeId: string) => void;
}) {
  const carouselRole = mapArchetypeToCarouselRole(gap.missingCapability || 'daily');

  // Transform recommendations for ShoeCarousel
  const carouselShoes = (result.recommendations || []).map((shoe) => ({
    ...shoe,
    tradeOffs: shoe.tradeOffs,
  }));

  return (
    <div className="w-full overflow-visible">
      <ShoeCarousel 
        recommendations={carouselShoes} 
        role={carouselRole} 
        shortlistedShoes={shortlistedShoes}
        onShortlist={onShortlist}
      />
    </div>
  );
}

function DiscoveryModeResults({ 
  result,
  shortlistedShoes,
  onShortlist,
}: { 
  result: DiscoveryResult;
  shortlistedShoes: string[];
  onShortlist: (shoeId: string) => void;
}) {
  // Flatten all discovery results into a single array with archetype attached to each shoe
  const flattenedRecommendations = (result.discoveryResults || []).flatMap((item) => 
    (item.recommendations || []).map((shoe) => ({
      ...shoe,
      archetype: item.archetype, // Attach the archetype to each shoe
    }))
  );

  // Use "daily" as a default role since we're showing mixed archetypes with badges
  return (
    <div className="w-full overflow-visible">
      <ShoeCarousel 
        recommendations={flattenedRecommendations} 
        role="daily"
        shortlistedShoes={shortlistedShoes}
        onShortlist={onShortlist}
        showRoleBadges={true}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [gap, setGap] = useState<Gap | null>(null);
  const [shortlistedShoes, setShortlistedShoes] = useState<string[]>([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const handleNavigationAttempt = useCallback((destination: string) => {
    if (shortlistedShoes.length === 0) {
      setPendingNavigation(destination);
      setShowLeaveModal(true);
    } else {
      navigate(destination);
    }
  }, [navigate, shortlistedShoes.length]);

  const goBack = useCallback(() => {
    handleNavigationAttempt("/profile/step4");
  }, [handleNavigationAttempt]);

  const handleShortlist = useCallback((shoeId: string) => {
    setShortlistedShoes(prev => {
      if (prev.includes(shoeId)) {
        toast.success("Removed from shortlist");
        return prev.filter(id => id !== shoeId);
      } else {
        toast.success("Added to shortlist");
        return [...prev, shoeId];
      }
    });
  }, []);

  const handleGoToProfile = useCallback(() => {
    handleNavigationAttempt("/");
  }, [handleNavigationAttempt]);

  const handleConfirmLeave = useCallback(() => {
    setShowLeaveModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  }, [navigate, pendingNavigation]);

  const goToLanding = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const loadDataAndFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Load data from localStorage
      const profile = loadProfile();
      const shoes = loadShoes();
      const storedGap = loadGap();
      const shoeRequests = loadShoeRequests();
      const feelPreferences = loadFromStorage<APIFeelPreferences>('cindaFeelPreferences');  // Keep this one for now
      const chatContext = loadChatContext();

      console.log('[Recommendations] Loaded from storage:', {
        hasProfile: !!profile,
        hasShoes: shoes.length,
        hasGap: !!storedGap,
        hasShoeRequests: shoeRequests?.length,
        hasFeelPreferences: !!feelPreferences,
        storedGap,
      });

      // 2. Validate required data
      if (!profile) {
        toast.error("Please complete the profile first");
        navigate("/");
        return;
      }

      const normalizedRaceTime = normalizeStoredRaceTimeForApi(
        profile.raceTime,
        (profile as any).raceTimeInput
      );

      // 3. Determine mode based on stored data
      // PRIORITY: shoeRequests → discovery mode (both analysis and discovery flows save shoeRequests)
      // FALLBACK: gap only (legacy) → analysis mode
      let detectedMode: Mode;

      if (shoeRequests && shoeRequests.length > 0) {
        // ShoeRequests exist - use discovery mode
        // This works for both flows since Step4b always saves shoeRequests
        detectedMode = "discovery";
        // Keep gap for display purposes if available (e.g., showing context)
        if (storedGap) {
          setGap(storedGap);
        }
        console.log('[Recommendations] Mode: discovery (shoeRequests found)', { shoeRequestsCount: shoeRequests.length });
      } else if (storedGap) {
        // Legacy fallback: gap exists but no shoeRequests
        detectedMode = "analysis";
        setGap(storedGap);
        console.log('[Recommendations] Mode: analysis (legacy - gap only)');
      } else {
        // No shoeRequests and no gap - redirect to profile builder
        console.log('[Recommendations] No shoeRequests or gap - redirecting');
        toast.error("Please complete the profile builder first");
        navigate("/profile/step4");
        return;
      }

      setMode(detectedMode);

      // Transform shoes to API format - include loveTags and dislikeTags
      const currentShoesForAPI = shoes.map((s) => {
        // Check if it's in context format (with nested shoe object)
        const shoeData = (s as { shoe?: { shoe_id: string } }).shoe;
        const shoeId = shoeData ? shoeData.shoe_id : (s as APICurrentShoe).shoeId;
        // Map runTypes values: "all_my_runs" → "all_runs"
        const runTypes = (s.runTypes || []).map((rt: string) =>
          rt === "all_my_runs" ? "all_runs" : rt
        );
        return {
          shoeId: shoeId,
          runTypes: runTypes,
          sentiment: s.sentiment || "neutral",
          loveTags: (s as { loveTags?: string[] }).loveTags,
          dislikeTags: (s as { dislikeTags?: string[] }).dislikeTags,
        };
      });

      let payload: Record<string, unknown>;

      if (detectedMode === "analysis") {
        payload = {
          mode: "analysis",
          profile: {
            firstName: profile.firstName,
            age: profile.age,
            height: profile.height,
            weight: profile.weight,
            experience: profile.experience,
            primaryGoal: profile.primaryGoal,
            runningPattern: profile.runningPattern,
            trailRunning: profile.trailRunning,
            footStrike: profile.footStrike,
            weeklyVolume: profile.weeklyVolume,
            raceTime: normalizedRaceTime,
            brandPreference: profile.brandPreference,
            currentNiggles: profile.currentNiggles,
          },
          currentShoes: currentShoesForAPI,
          gap: storedGap,
          feelPreferences: feelPreferences,
          chatContext: chatContext,
        };
      } else {
        payload = {
          mode: "discovery",
          profile: {
            firstName: profile.firstName,
            age: profile.age,
            height: profile.height,
            weight: profile.weight,
            experience: profile.experience,
            primaryGoal: profile.primaryGoal,
            runningPattern: profile.runningPattern,
            trailRunning: profile.trailRunning,
            footStrike: profile.footStrike,
            weeklyVolume: profile.weeklyVolume,
            raceTime: normalizedRaceTime,
            brandPreference: profile.brandPreference,
            currentNiggles: profile.currentNiggles,
          },
          currentShoes: currentShoesForAPI,
          shoeRequests: shoeRequests,
          chatContext: chatContext,
        };
      }

      // 5. Call the API
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error("Invalid request - please check your profile");
        }
        throw new Error("Something went wrong");
      }

      const data = await response.json();
      console.log('[Recommendations] API response:', data);

      if (!data.success) {
        throw new Error(data.error || "Failed to get recommendations");
      }

      // 6. Set results based on mode
      if (detectedMode === "analysis") {
        // Handle both 'analysis' and 'gap_detection' response formats
        const resultGap = data.result?.gap;
        const resultRecommendations = data.result?.recommendations || [];
        const resultSummary = data.result?.summaryReasoning || '';
        const resultRotationSummary = data.result?.rotationSummary || [];
        
        console.log('[Recommendations] Analysis result:', {
          hasGap: !!resultGap,
          recommendationsCount: resultRecommendations.length,
          rotationSummaryCount: resultRotationSummary.length,
        });

        setAnalysisResult({
          gap: resultGap || storedGap,
          recommendations: resultRecommendations,
          summaryReasoning: resultSummary,
          rotationSummary: resultRotationSummary,
        });
        // Update gap from response if available, fallback to stored
        if (resultGap) {
          setGap(resultGap);
        }
      } else {
        // Discovery mode - handle discoveryResults
        const discoveryResults = data.result?.discoveryResults || [];
        console.log('[Recommendations] Discovery results:', discoveryResults.length);
        setDiscoveryResult({
          discoveryResults: discoveryResults,
        });
      }
    } catch (err) {
      console.error("Error loading recommendations:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDataAndFetch();
  }, [loadDataAndFetch]);

  // Check for empty results - analysis mode is not empty if it has rotationSummary
  const hasAnalysisContent = analysisResult && (
    (analysisResult.recommendations && analysisResult.recommendations.length > 0) ||
    (analysisResult.rotationSummary && analysisResult.rotationSummary.length > 0)
  );
  
  const isEmpty =
    (mode === "analysis" && !hasAnalysisContent) ||
    (mode === "discovery" && (discoveryResult?.discoveryResults?.length === 0 || 
      discoveryResult?.discoveryResults?.every(r => r.recommendations?.length === 0)));

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable={!loading} allowOverflow={!loading}>
        {/* Header - transparent */}
        <header className="w-full px-6 md:px-8 pt-4 md:pt-6 pb-2 flex items-center justify-between flex-shrink-0">
          <BackButton onClick={goBack} />
          <ProfileButton onClick={handleGoToProfile} />
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-visible">
          {loading && <LoadingState />}

          {!loading && error && (
            <ErrorState
              error={error}
              onRetry={loadDataAndFetch}
              onBack={goBack}
            />
          )}

          {!loading && !error && isEmpty && (
            <EmptyState onBack={goBack} />
          )}

          {!loading && !error && !isEmpty && mode === "analysis" && analysisResult && gap && (
            <div className="flex-1 flex flex-col min-h-0 overflow-visible">
              <PageHeader />
              {/* Show AnalysisSummaryView if no recommendations but has rotationSummary */}
              {(!analysisResult.recommendations || analysisResult.recommendations.length === 0) && 
               analysisResult.rotationSummary && analysisResult.rotationSummary.length > 0 ? (
                <AnalysisSummaryView 
                  gap={gap}
                  rotationSummary={analysisResult.rotationSummary}
                  onSetPreferences={() => navigate('/profile/step4b', { 
                    state: { recommendedArchetype: gap.recommendedArchetype || gap.missingCapability } 
                  })}
                />
              ) : (
                <div className="flex-1 flex items-center min-h-0 overflow-visible">
                  <AnalysisModeResults 
                    result={analysisResult} 
                    gap={gap} 
                    shortlistedShoes={shortlistedShoes}
                    onShortlist={handleShortlist}
                  />
                </div>
              )}
            </div>
          )}

          {!loading && !error && !isEmpty && mode === "discovery" && discoveryResult && (
            <div className="flex-1 flex flex-col min-h-0 overflow-visible">
              <PageHeader />
              <div className="flex-1 flex items-center min-h-0 overflow-visible">
                <DiscoveryModeResults 
                  result={discoveryResult}
                  shortlistedShoes={shortlistedShoes}
                  onShortlist={handleShortlist}
                />
              </div>
            </div>
          )}
        </div>

      </OnboardingLayout>

      {/* Leave confirmation modal */}
      <LeaveRecommendationsModal
        open={showLeaveModal}
        onOpenChange={setShowLeaveModal}
        onStay={() => setShowLeaveModal(false)}
        onLeave={handleConfirmLeave}
      />
    </>
  );
}
