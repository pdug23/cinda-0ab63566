import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ShoeCarousel } from "@/components/results/ShoeCarousel";
import { loadProfile, loadShoes, loadShoeRequests, loadGap } from "@/utils/storage";
import type { FeelPreferences as APIFeelPreferences, CurrentShoe as APICurrentShoe } from "../../api/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RecommendedShoe {
  shoeId: string;
  fullName: string;
  brand: string;
  model: string;
  version: string;
  weight_feel_1to5: 1 | 2 | 3 | 4 | 5;
  heel_drop_mm: number;
  has_plate: boolean;
  plate_material: "Nylon" | "Plastic" | "Carbon" | null;
  matchReason: string[];
  keyStrengths: string[];
  tradeOffs?: string[];
  similar_to?: string;
  recommendationType: "close_match" | "close_match_2" | "trade_off_option";
}

interface Gap {
  type: string;
  severity: string;
  reasoning: string;
  missingCapability?: string;
}

interface ShoeRequest {
  role: string;
  feelPreferences: {
    softVsFirm: number;
    stableVsNeutral: number;
    bouncyVsDamped: number;
  };
}

interface AnalysisResult {
  gap: Gap;
  recommendations: RecommendedShoe[];
  summaryReasoning: string;
}

interface ShoppingResultItem {
  role: string;
  recommendations: RecommendedShoe[];
  reasoning: string;
}

interface ShoppingResult {
  shoppingResults: ShoppingResultItem[];
}

type Mode = "analysis" | "shopping";

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

function mapRoleToCarouselRole(role: string): "daily" | "tempo" | "race" | "easy" | "long" | "trail" {
  const roleMap: Record<string, "daily" | "tempo" | "race" | "easy" | "long" | "trail"> = {
    daily_trainer: "daily",
    daily: "daily",
    tempo: "tempo",
    race_day: "race",
    race: "race",
    recovery: "easy",
    easy: "easy",
    long: "long",
    trail: "trail",
    not_sure: "daily",
  };
  return roleMap[role.toLowerCase()] || "daily";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="relative w-full max-w-[320px] aspect-[3/4] rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-card-foreground/5 animate-pulse" />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
            animation: "shimmer 1.5s infinite",
          }}
        />
      </div>
      <p className="text-card-foreground/60 text-base animate-pulse">
        Finding your perfect matches...
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
      className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-foreground/60 hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/10 border border-foreground/20 transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      back
    </button>
  );
}

function PageHeader() {
  return (
    <div className="text-center py-2 px-5 bg-background">
      <h1 className="text-xl font-bold text-foreground/90 lowercase">
        cinda's recommendations
      </h1>
    </div>
  );
}


function AnalysisModeResults({
  result,
  gap
}: {
  result: AnalysisResult;
  gap: Gap;
}) {
  const carouselRole = mapRoleToCarouselRole(gap.missingCapability || 'daily');

  // Transform recommendations for ShoeCarousel
  const carouselShoes = result.recommendations.map((shoe) => ({
    ...shoe,
    tradeOffs: shoe.tradeOffs,
  }));

  return (
    <div className="w-full">
      <ShoeCarousel recommendations={carouselShoes} role={carouselRole} />
    </div>
  );
}

function ShoppingModeResults({ result }: { result: ShoppingResult }) {
  return (
    <div className="w-full space-y-8">
      {result.shoppingResults.map((item, index) => {
        const carouselRole = mapRoleToCarouselRole(item.role);

        return (
          <div key={item.role} className="w-full">
            {index > 0 && (
              <div className="h-px bg-card-foreground/10 mx-6 mb-4" />
            )}
            <ShoeCarousel recommendations={item.recommendations} role={carouselRole} />
          </div>
        );
      })}
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
  const [shoppingResult, setShoppingResult] = useState<ShoppingResult | null>(null);
  const [gap, setGap] = useState<Gap | null>(null);

  const goBack = useCallback(() => {
    navigate("/profile/step4b");
  }, [navigate]);

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

      // 2. Validate required data
      if (!profile) {
        toast.error("Please complete the profile first");
        navigate("/");
        return;
      }

      // 3. Determine mode based on stored data
      // Analysis mode: has gap + feelPreferences
      // Shopping mode: has shoeRequests
      let detectedMode: Mode;

      if (storedGap && feelPreferences) {
        detectedMode = "analysis";
        setGap(storedGap);
      } else if (shoeRequests && shoeRequests.length > 0) {
        detectedMode = "shopping";
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

      // 4. Build API payload based on mode
      // Transform shoes to API format - handle both context format and API format
      const currentShoesForAPI = shoes.map((s) => {
        // Check if it's in context format (with nested shoe object)
        const shoeData = (s as { shoe?: { shoe_id: string } }).shoe;
        const shoeId = shoeData ? shoeData.shoe_id : (s as APICurrentShoe).shoeId;
        return {
          shoeId: shoeId,
          roles: s.roles,
          sentiment: s.sentiment || "neutral",
        };
      });

      let payload: Record<string, unknown>;

      if (detectedMode === "analysis") {
        payload = {
          mode: "analysis",
          profile: {
            firstName: profile.firstName,
            experience: profile.experience,
            primaryGoal: profile.primaryGoal,
            runningPattern: profile.runningPattern,
            weeklyVolume: profile.weeklyVolume,
          },
          currentShoes: currentShoesForAPI,
          gap: storedGap,
          feelPreferences: feelPreferences,
        };
      } else {
        payload = {
          mode: "shopping",
          profile: {
            firstName: profile.firstName,
            experience: profile.experience,
            primaryGoal: profile.primaryGoal,
            runningPattern: profile.runningPattern,
            weeklyVolume: profile.weeklyVolume,
          },
          currentShoes: currentShoesForAPI,
          shoeRequests: shoeRequests,
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
        setShoppingResult({
          shoppingResults: data.result.shoppingResults,
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
    (mode === "shopping" && shoppingResult?.shoppingResults.length === 0);

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable>
        {/* Header - white background */}
        <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-start flex-shrink-0 bg-background">
          <BackButton onClick={goBack} />
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
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
            <div className="flex-1 flex flex-col min-h-0">
              <PageHeader />
              <div className="flex-1 flex items-center min-h-0">
                <AnalysisModeResults result={analysisResult} gap={gap} />
              </div>
            </div>
          )}

          {!loading && !error && !isEmpty && mode === "shopping" && shoppingResult && (
            <div className="flex-1 flex flex-col min-h-0">
              <PageHeader />
              <div className="flex-1 flex items-center min-h-0">
                <ShoppingModeResults result={shoppingResult} />
              </div>
            </div>
          )}
        </div>
      </OnboardingLayout>
    </>
  );
}
