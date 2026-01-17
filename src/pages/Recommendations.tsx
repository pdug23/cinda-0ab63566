import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ShoeCarousel } from "@/components/results/ShoeCarousel";
import { Button } from "@/components/ui/button";
import { LeaveRecommendationsModal } from "@/components/LeaveRecommendationsModal";
import { loadProfile, loadShoes, loadShoeRequests, loadGap, loadChatContext } from "@/utils/storage";
import { normalizeStoredRaceTimeForApi } from "@/utils/raceTime";
import type { FeelPreferences as APIFeelPreferences, CurrentShoe as APICurrentShoe } from "../../api/types";
import cindaLogo from "@/assets/cinda-logo-white-v2.png";

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
}

interface AnalysisResult {
  gap: Gap;
  recommendations: RecommendedShoe[];
  summaryReasoning: string;
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
  const [spinKey, setSpinKey] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Trigger spin every 3 seconds
  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setSpinKey(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Cycle through loading messages every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
      {/* Spinning Logo */}
      <img
        key={spinKey}
        src={cindaLogo}
        alt="cinda"
        className="w-20 h-20"
        style={{
          animation: prefersReducedMotion ? 'none' : 'spin-settle 0.6s ease-out',
        }}
      />

      {/* Glowing card placeholder */}
      <div 
        className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden"
        style={{
          animation: 'border-glisten 3s ease-in-out infinite',
        }}
      >
        <div className="absolute inset-0 bg-card-foreground/5" />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            animation: "shimmer 2s infinite",
          }}
        />
        {/* Shoe silhouette placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="w-32 h-20 rounded-full bg-card-foreground/10"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
        </div>
      </div>

      {/* Rotating loading messages with fade */}
      <p 
        key={messageIndex}
        className="text-card-foreground/70 text-base italic animate-fade-in"
        style={{ fontWeight: 700 }}
      >
        {loadingMessages[messageIndex]}
      </p>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
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
      try again
    </button>
  );
}

function PageHeader() {
  return (
    <div className="text-center py-1 px-5">
      <h1 className="text-xl font-bold text-card-foreground/90 lowercase">
        cinda's recommendations
      </h1>
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
  const carouselShoes = result.recommendations.map((shoe) => ({
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
        toast.success("removed from shortlist");
        return prev.filter(id => id !== shoeId);
      } else {
        toast.success("added to shortlist");
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
      // Analysis mode: has gap + feelPreferences
      // Shopping mode: has shoeRequests
      let detectedMode: Mode;

      if (storedGap && feelPreferences) {
        detectedMode = "analysis";
        setGap(storedGap);
      } else if (shoeRequests && shoeRequests.length > 0) {
        detectedMode = "discovery";
      } else {
        // Default to analysis if we have gap, otherwise redirect
        if (storedGap) {
          detectedMode = "analysis";
          setGap(storedGap);
        } else {
          toast.error("Please complete the profile builder first");
          navigate("/profile/step4");
          return;
        }
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

      if (!data.success) {
        throw new Error(data.error || "Failed to get recommendations");
      }

      // 6. Set results based on mode
      if (detectedMode === "analysis") {
        setAnalysisResult({
          gap: data.result.gap,
          recommendations: data.result.recommendations,
          summaryReasoning: data.result.summaryReasoning,
        });
        // Update gap from response if available
        if (data.result.gap) {
          setGap(data.result.gap);
        }
      } else {
        // Discovery mode - handle discoveryResults
        const discoveryResults = data.result?.discoveryResults || [];
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

  // Check for empty results
  const isEmpty =
    (mode === "analysis" && analysisResult?.recommendations.length === 0) ||
    (mode === "discovery" && (discoveryResult?.discoveryResults?.length === 0 || 
      discoveryResult?.discoveryResults?.every(r => r.recommendations?.length === 0)));

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable={!loading} allowOverflow={!loading}>
        {/* Header - transparent */}
        <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-start flex-shrink-0">
          <BackButton onClick={goBack} />
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
              <div className="flex-1 flex items-center min-h-0 overflow-visible">
                <AnalysisModeResults 
                  result={analysisResult} 
                  gap={gap} 
                  shortlistedShoes={shortlistedShoes}
                  onShortlist={handleShortlist}
                />
              </div>
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

        {/* Footer */}
        {!loading && !error && !isEmpty && (
          <footer className="px-6 md:px-8 pb-4 pt-2 flex-shrink-0">
            <Button
              onClick={handleGoToProfile}
              variant="cta"
              className="w-full min-h-[44px] text-sm"
            >
              go to my profile
            </Button>
          </footer>
        )}
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
