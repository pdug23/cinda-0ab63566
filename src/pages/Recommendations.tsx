import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import { ShoeCarousel } from "@/components/results/ShoeCarousel";
import { Button } from "@/components/ui/button";
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

function getShortlist(): string[] {
  try {
    const stored = localStorage.getItem("cindaShortlist");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
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
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4 text-center">
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
    <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4 text-center">
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

function TryAgainButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-primary bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
      aria-label="Try again"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      try again
    </button>
  );
}

function PageHeader() {
  return (
    <div className="text-center py-2 px-5 flex-shrink-0">
      <h1 className="text-xl font-bold text-card-foreground/90 lowercase">
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

  const carouselShoes = result.recommendations.map((shoe) => ({
    ...shoe,
    tradeOffs: shoe.tradeOffs,
  }));

  return (
    <div className="w-full h-full flex items-center overflow-visible">
      <ShoeCarousel recommendations={carouselShoes} role={carouselRole} />
    </div>
  );
}

function ShoppingModeResults({ result }: { result: ShoppingResult }) {
  return (
    <div className="w-full h-full flex items-center overflow-visible">
      {result.shoppingResults.length > 0 && (
        <ShoeCarousel 
          recommendations={result.shoppingResults[0].recommendations} 
          role={mapRoleToCarouselRole(result.shoppingResults[0].role)} 
        />
      )}
    </div>
  );
}

function Footer({ onGoToProfile }: { onGoToProfile: () => void }) {
  const handleClick = () => {
    const shortlist = getShortlist();
    if (shortlist.length === 0) {
      toast.error("shortlist at least one shoe to build your profile");
      return;
    }
    onGoToProfile();
  };

  return (
    <footer className="flex-shrink-0 w-full px-6 py-4 border-t border-card-foreground/10 bg-background/80 backdrop-blur-sm">
      <Button
        onClick={handleClick}
        className="w-full h-12 text-sm font-medium lowercase"
      >
        go to my profile
      </Button>
    </footer>
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

  const goToModeSelection = useCallback(() => {
    navigate("/profile/step4");
  }, [navigate]);

  const goToProfile = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  const loadDataAndFetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const profile = loadProfile();
      const shoes = loadShoes();
      const storedGap = loadGap();
      const shoeRequests = loadShoeRequests();
      const feelPreferences = loadFromStorage<APIFeelPreferences>('cindaFeelPreferences');

      if (!profile) {
        toast.error("Please complete the profile first");
        navigate("/");
        return;
      }

      let detectedMode: Mode;

      if (storedGap && feelPreferences) {
        detectedMode = "analysis";
        setGap(storedGap);
      } else if (shoeRequests && shoeRequests.length > 0) {
        detectedMode = "shopping";
      } else {
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

      const currentShoesForAPI = shoes.map((s) => {
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

      if (detectedMode === "analysis") {
        setAnalysisResult({
          gap: data.result.gap,
          recommendations: data.result.recommendations,
          summaryReasoning: data.result.summaryReasoning,
        });
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

  const isEmpty =
    (mode === "analysis" && analysisResult?.recommendations.length === 0) ||
    (mode === "shopping" && shoppingResult?.shoppingResults.length === 0);

  const showFooter = !loading && !error && !isEmpty;

  return (
    <>
      <AnimatedBackground />
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Header - Back/Try Again button */}
        <header className="flex-shrink-0 w-full px-6 pt-4 pb-2 flex items-center justify-start">
          <TryAgainButton onClick={goToModeSelection} />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-visible">
          {loading && <LoadingState />}

          {!loading && error && (
            <ErrorState
              error={error}
              onRetry={loadDataAndFetch}
              onBack={goToModeSelection}
            />
          )}

          {!loading && !error && isEmpty && (
            <EmptyState onBack={goToModeSelection} />
          )}

          {!loading && !error && !isEmpty && mode === "analysis" && analysisResult && gap && (
            <div className="flex-1 flex flex-col min-h-0 overflow-visible">
              <PageHeader />
              <div className="flex-1 min-h-0 overflow-visible">
                <AnalysisModeResults result={analysisResult} gap={gap} />
              </div>
            </div>
          )}

          {!loading && !error && !isEmpty && mode === "shopping" && shoppingResult && (
            <div className="flex-1 flex flex-col min-h-0 overflow-visible">
              <PageHeader />
              <div className="flex-1 min-h-0 overflow-visible">
                <ShoppingModeResults result={shoppingResult} />
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        {showFooter && <Footer onGoToProfile={goToProfile} />}
      </div>
    </>
  );
}
