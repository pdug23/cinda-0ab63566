import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, DiscoveryArchetype, GapData } from "@/contexts/ProfileContext";
import { buildAPIRaceTimeFromPicker } from "@/utils/raceTime";
import { saveGap } from "@/utils/storage";
import { cn } from "@/lib/utils";
import cindaLogo from "@/assets/cinda-logo-grey.png";

type Status = "loading" | "success" | "no_gap" | "error";

interface RotationShoeSummary {
  shoe: { shoe_id: string; full_name: string };
  userRunTypes: string[];
  archetypes: string[];
  misuseLevel: "severe" | "suboptimal" | "good";
  misuseMessage?: string;
}

interface AnalysisData {
  rotationSummary: {
    prose: string;
    strengths: string[];
    improvements: string[];
  };
  recommendations: {
    tier: 1 | 2 | 3;
    confidence: "high" | "medium" | "soft";
    primary: { archetype: string; reason: string };
    secondary?: { archetype: string; reason: string };
  };
  health: Record<string, number>;
}

const formatRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    daily: "daily training",
    tempo: "tempo",
    intervals: "intervals",
    easy: "easy pace",
    race: "races",
    trail: "trail",
    long_runs: "long runs",
    recovery: "recovery",
  };
  return labels[role] || role.toLowerCase().replace(/_/g, " ");
};

const formatArchetypesToRunTypes = (archetypes: string[]): string => {
  if (!archetypes || archetypes.length === 0) return "";

  const runTypeMap: Record<string, string[]> = {
    daily_trainer: ["recovery runs", "long runs at a comfortable pace"],
    recovery_shoe: ["recovery runs"],
    workout_shoe: ["workouts", "long runs with workout segments"],
    race_shoe: ["races", "workouts", "long runs with workout segments"],
    trail_shoe: ["trail"],
  };

  const allRunTypes: string[] = [];
  archetypes.forEach((archetype) => {
    const types = runTypeMap[archetype] || [];
    allRunTypes.push(...types);
  });

  const hasComfortablePace = allRunTypes.includes("long runs at a comfortable pace");
  const hasWorkoutSegments = allRunTypes.includes("long runs with workout segments");

  let finalTypes: string[];
  if (hasComfortablePace && hasWorkoutSegments) {
    finalTypes = allRunTypes.filter(
      (t) => t !== "long runs at a comfortable pace" && t !== "long runs with workout segments"
    );
    finalTypes.push("all long runs");
  } else {
    finalTypes = [...allRunTypes];
  }

  const unique = [...new Set(finalTypes)];
  return unique.join(", ");
};

const formatArchetype = (archetype: string): string => {
  const labels: Record<string, string> = {
    daily_trainer: "daily trainer",
    recovery_shoe: "recovery shoe",
    workout_shoe: "workout shoe",
    race_shoe: "race shoe",
    trail_shoe: "trail shoe",
  };
  return labels[archetype] || archetype.replace(/_/g, " ");
};

// Tier config kept for potential future use but currently not shown
const TIER_CONFIG = {
  1: { label: "priority", className: "bg-red-500/20 text-red-400 border-red-500/40" },
  2: { label: "recommended", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  3: { label: "explore", className: "bg-teal-500/20 text-teal-400 border-teal-500/40" },
} as const;

const ProfileBuilderStep4Analysis = () => {
  const navigate = useNavigate();
  const { profileData, updateStep4 } = useProfile();
  const { step1, step2, step3 } = profileData;
  const [status, setStatus] = useState<Status>("loading");
  const [gap, setGap] = useState<GapData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [rotationSummary, setRotationSummary] = useState<RotationShoeSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const analyzeRotation = async () => {
    setStatus("loading");
    setErrorMessage("");

    if (!step3.currentShoes || step3.currentShoes.length === 0) {
      setErrorMessage("No shoes found in your rotation. Please add shoes first.");
      setStatus("error");
      return;
    }

    try {
      const profile = {
        firstName: step1.firstName,
        age: step1.age ? parseInt(step1.age) : undefined,
        height: step1.heightCm ? { value: step1.heightCm, unit: "cm" as const } : undefined,
        weight: step1.weightKg ? { value: step1.weightKg, unit: "kg" as const } : undefined,
        experience: step1.experience!,
        primaryGoal: step2.primaryGoal!,
        runningPattern: step2.runningPattern ?? undefined,
        trailRunning: step2.trailRunning ?? undefined,
        footStrike: step2.footStrike ?? undefined,
        weeklyVolume: step2.weeklyVolume ?? undefined,
        raceTime: step2.raceTime ? buildAPIRaceTimeFromPicker(step2.raceTime) : undefined,
        currentNiggles: step3.chatContext.injuries.length > 0 ? step3.chatContext.injuries : undefined,
      };

      const currentShoes = (step3.currentShoes || []).map((shoe) => ({
        shoeId: shoe.shoe.shoe_id,
        runTypes: shoe.runTypes,
        sentiment: shoe.sentiment ?? "neutral",
        loveTags: shoe.loveTags,
        dislikeTags: shoe.dislikeTags,
      }));

      const chatContext = {
        injuries: step3.chatContext.injuries,
        pastShoes: step3.chatContext.pastShoes,
        fit: step3.chatContext.fit,
        climate: step3.chatContext.climate,
        requests: step3.chatContext.requests,
      };

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "gap_detection",
          profile,
          currentShoes,
          chatContext,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to analyse rotation");
      }

      const analysisData = data.result?.analysis;
      const detectedGap = data.result?.gap;
      const summary = data.result?.rotationSummary || [];
      setRotationSummary(summary);

      // New analysis structure takes priority
      if (analysisData) {
        setAnalysis(analysisData);
        // Pre-select all recommendations
        const archetypes = [analysisData.recommendations.primary.archetype];
        if (analysisData.recommendations.secondary) {
          archetypes.push(analysisData.recommendations.secondary.archetype);
        }
        setSelectedArchetypes(archetypes);
        // Also set gap for backwards compat
        if (detectedGap) {
          setGap(detectedGap);
          updateStep4({ gap: detectedGap });
          saveGap(detectedGap);
        }
        setStatus("success");
      } else if (detectedGap) {
        // Legacy fallback
        setGap(detectedGap);
        updateStep4({ gap: detectedGap });
        saveGap(detectedGap);
        if (detectedGap.severity === "low") {
          setStatus("no_gap");
        } else {
          setStatus("success");
        }
      } else {
        setStatus("no_gap");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  };

  useEffect(() => {
    analyzeRotation();
  }, []);

  const handleToggleArchetype = (archetype: string) => {
    if (selectedArchetypes.includes(archetype)) {
      // Prevent deselecting if it's the only one
      if (selectedArchetypes.length > 1) {
        setSelectedArchetypes((prev) => prev.filter((a) => a !== archetype));
      }
    } else {
      setSelectedArchetypes((prev) => [...prev, archetype]);
    }
  };

  const getCTAText = (): string => {
    // Tier 3 = exploration mode, softer language
    if (analysis?.recommendations.tier === 3) {
      return "explore these options";
    }
    if (selectedArchetypes.length === 2) {
      return "set preferences for your new shoes";
    }
    return `set preferences for your new ${formatArchetype(selectedArchetypes[0])}`;
  };

  const handleSetPreferences = () => {
    if (selectedArchetypes.length === 0) return;
    updateStep4({
      selectedArchetypes: selectedArchetypes as DiscoveryArchetype[],
      currentArchetypeIndex: 0,
    });
    navigate("/profile/step4b");
  };

  const handleHappyWithRotation = () => {
    navigate("/");
  };

  const handleChooseSpecific = () => {
    navigate("/profile/step4a");
  };

  // Legacy recommendation section (fallback)
  const LegacyRecommendationSection = () => {
    if (!gap) return null;

    return (
      <div className="w-full mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4 lowercase">
          cinda's recommendation
        </h3>
        <div
          className="relative bg-transparent rounded-lg p-4 border-2 border-slate-500 overflow-hidden"
          style={{ animation: "border-glisten 4s ease-in-out infinite" }}
        >
          <p className="text-white mb-3 lowercase">
            based on your rotation, you'd benefit from a{" "}
            <span
              className="font-bold"
              style={{
                background:
                  "linear-gradient(90deg, #94a3b8 0%, #94a3b8 30%, #ffffff 50%, #94a3b8 70%, #94a3b8 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "text-glisten 3s ease-in-out infinite",
              }}
            >
              {formatArchetype(gap.recommendedArchetype || "daily_trainer")}
            </span>
          </p>
          {gap.reasoning && (
            <p className="text-sm text-gray-300 lowercase relative z-10">
              {gap.reasoning}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Analysis summary section (static text, no typing animation)
  const AnalysisSummarySection = () => {
    if (!analysis?.rotationSummary) return null;

    const { prose } = analysis.rotationSummary;

    return (
      <div className="w-full mb-4">
        <div className="bg-card/80 rounded-lg p-4 border-2 border-slate-400">
          <p className="text-white/90 leading-relaxed lowercase">
            {prose}
          </p>
        </div>
      </div>
    );
  };

  // Recommendation box with tier-aware phrasing (first box on page)
  const RecommendationBoxSection = () => {
    if (!analysis?.recommendations) return null;

    const { tier, primary, secondary } = analysis.recommendations;
    const hasSecondary = !!secondary;

    const primaryIncluded = selectedArchetypes.includes(primary.archetype);
    const secondaryIncluded = secondary
      ? selectedArchetypes.includes(secondary.archetype)
      : false;

    const canSkipPrimary = secondaryIncluded;
    const canSkipSecondary = primaryIncluded;

    // Tier-aware intro text
    const getIntroText = (archetype: string) => {
      if (tier === 3) {
        return (
          <>
            if you're looking to experiment, you could explore a{" "}
            <span
              className="font-bold"
              style={{
                background:
                  "linear-gradient(90deg, #94a3b8 0%, #94a3b8 30%, #ffffff 50%, #94a3b8 70%, #94a3b8 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "text-glisten 3s ease-in-out infinite",
              }}
            >
              {formatArchetype(archetype)}
            </span>
          </>
        );
      }
      return (
        <>
          based on your rotation, you'd benefit from a{" "}
          <span
            className="font-bold"
            style={{
              background:
                "linear-gradient(90deg, #94a3b8 0%, #94a3b8 30%, #ffffff 50%, #94a3b8 70%, #94a3b8 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "text-glisten 3s ease-in-out infinite",
            }}
          >
            {formatArchetype(archetype)}
          </span>
        </>
      );
    };

    // Single recommendation (no pills needed)
    if (!hasSecondary) {
      return (
        <div className="w-full mb-4">
          <div className="bg-card/80 rounded-lg p-4 border-2 border-slate-400">
            <p className="text-white mb-3 lowercase">
              {getIntroText(primary.archetype)}
            </p>
            <p className="text-sm text-gray-300 lowercase">
              {primary.reason}
            </p>
          </div>
        </div>
      );
    }

    // Two recommendations with include/skip pills
    return (
      <div className="w-full mb-4 flex flex-col gap-3">
        <div
          className={cn(
            "bg-card/80 rounded-lg p-4 border-2 transition-all",
            primaryIncluded ? "border-slate-400" : "border-slate-600/30 opacity-50"
          )}
        >
          <p className="text-white mb-3 lowercase">
            {getIntroText(primary.archetype)}
          </p>
          <p className="text-sm text-gray-300 lowercase">{primary.reason}</p>
          <IncludeSkipPills
            isIncluded={primaryIncluded}
            onToggle={() => handleToggleArchetype(primary.archetype)}
            canSkip={canSkipPrimary}
          />
        </div>
        <div
          className={cn(
            "bg-card/80 rounded-lg p-4 border-2 transition-all",
            secondaryIncluded ? "border-slate-400" : "border-slate-600/30 opacity-50"
          )}
        >
          <p className="text-white mb-3 lowercase">
            {getIntroText(secondary.archetype)}
          </p>
          <p className="text-sm text-gray-300 lowercase">{secondary.reason}</p>
          <IncludeSkipPills
            isIncluded={secondaryIncluded}
            onToggle={() => handleToggleArchetype(secondary.archetype)}
            canSkip={canSkipSecondary}
          />
        </div>
      </div>
    );
  };

  // Include/Skip pill buttons
  const IncludeSkipPills = ({
    isIncluded,
    onToggle,
    canSkip,
  }: {
    isIncluded: boolean;
    onToggle: () => void;
    canSkip: boolean;
  }) => (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => !isIncluded && onToggle()}
        className={cn(
          "px-3 py-1 text-xs rounded-full border transition-all lowercase",
          isIncluded
            ? "bg-slate-500/30 border-slate-400 text-white"
            : "bg-transparent border-slate-600 text-slate-400 hover:border-slate-500"
        )}
      >
        include
      </button>
      <button
        onClick={() => isIncluded && canSkip && onToggle()}
        disabled={!canSkip}
        className={cn(
          "px-3 py-1 text-xs rounded-full border transition-all lowercase",
          !isIncluded
            ? "bg-slate-500/30 border-slate-400 text-white"
            : "bg-transparent border-slate-600 text-slate-400 hover:border-slate-500",
          !canSkip && isIncluded && "opacity-40 cursor-not-allowed"
        )}
      >
        skip
      </button>
    </div>
  );

  // Note: Old RecommendationCard and RecommendationsSection removed - now using RecommendationBoxSection

  const CurrentRotationSection = () => {
    if (!rotationSummary || rotationSummary.length === 0) return null;

    return (
      <div className="w-full mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4 lowercase">
          your current rotation
        </h3>
        <div className="flex flex-col gap-3">
          {rotationSummary.map((item, index) => {
            const isSevere = item.misuseLevel === "severe";

            return (
              <div
                key={item.shoe.shoe_id || index}
                className={`bg-card/80 rounded-lg p-4 border-2 ${
                  isSevere ? "border-red-500" : "border-green-500"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isSevere ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  <p className="text-white font-medium">{item.shoe.full_name}</p>
                </div>
                <p className="text-sm text-gray-300 mb-1 lowercase">
                  you use it for: {(item.userRunTypes || []).map(formatRoleLabel).join(", ")}
                </p>
                <p className="text-sm text-gray-300 lowercase">
                  best suited for: {formatArchetypesToRunTypes(item.archetypes || [])}
                </p>
                {isSevere && item.misuseMessage && (
                  <div className="mt-3 p-2 bg-red-500/15 border border-red-500/30 rounded-md">
                    <p className="text-sm text-red-400 lowercase">{item.misuseMessage}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Loading skeleton matching new layout: logo → recommendation → summary → rotation
  const LoadingSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {/* Logo skeleton */}
      <div className="flex justify-center">
        <div className="w-8 h-8 bg-card-foreground/10 rounded-full" />
      </div>
      {/* Recommendation box skeleton */}
      <div className="h-24 bg-card-foreground/10 rounded-lg" />
      {/* Summary box skeleton */}
      <div className="h-20 bg-card-foreground/10 rounded-lg" />
      {/* Rotation header + cards skeleton */}
      <div>
        <div className="h-4 w-32 bg-card-foreground/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-24 bg-card-foreground/10 rounded-lg" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable>
        <PageTransition className="flex flex-col flex-1 min-h-0">
          {/* Card header with back button */}
          <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-start flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate("/profile/step3")}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              back
            </button>
          </header>
          <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 px-6 md:px-8">
            {/* Loading State */}
            {status === "loading" && (
              <div className="flex flex-col animate-in fade-in duration-300 flex-1">
                <LoadingSkeleton />
              </div>
            )}

            {/* Success State - New Analysis Structure */}
            {status === "success" && analysis && (
              <div className="flex flex-col animate-in fade-in duration-300 flex-1 min-h-0 overflow-hidden">
                <div
                  className="flex-1 min-h-0 overflow-y-auto pb-6 pr-2 scrollbar-styled touch-pan-y"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {/* Cinda logo at top */}
                  <div className="flex justify-center mb-4">
                    <img 
                      src={cindaLogo}
                      alt=""
                      className="w-8 h-8 opacity-40 animate-spin-once"
                    />
                  </div>
                  {/* New order: Recommendation → Summary → Current Rotation */}
                  <RecommendationBoxSection />
                  <AnalysisSummarySection />
                  <CurrentRotationSection />
                </div>
                <div className="flex flex-col items-center pt-4 pb-4 flex-shrink-0">
                  <Button
                    onClick={handleSetPreferences}
                    variant="cta"
                    className="w-full min-h-[44px] text-sm"
                    disabled={selectedArchetypes.length === 0}
                  >
                    {getCTAText()}
                  </Button>
                  {analysis.recommendations.tier === 3 && (
                    <button
                      onClick={handleHappyWithRotation}
                      className="mt-4 text-sm text-slate-400 hover:text-slate-300 underline underline-offset-4 decoration-dotted lowercase"
                    >
                      i'm happy with my rotation
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success State - Legacy Gap Fallback */}
            {status === "success" && !analysis && gap && (
              <div className="flex flex-col animate-in fade-in duration-300 flex-1 min-h-0 overflow-hidden">
                <div
                  className="flex-1 min-h-0 overflow-y-auto pb-6 pr-2 scrollbar-styled touch-pan-y"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <LegacyRecommendationSection />
                  <CurrentRotationSection />
                </div>
                <div className="flex flex-col items-center pt-4 pb-4 flex-shrink-0">
                  <Button
                    onClick={() => {
                      const archetype = (gap.recommendedArchetype || "daily_trainer") as DiscoveryArchetype;
                      updateStep4({
                        selectedArchetypes: [archetype],
                        currentArchetypeIndex: 0,
                      });
                      navigate("/profile/step4b");
                    }}
                    variant="cta"
                    className="w-full min-h-[44px] text-sm"
                  >
                    set preferences for your new {formatArchetype(gap.recommendedArchetype || "daily_trainer")}
                  </Button>
                </div>
              </div>
            )}

            {/* No Gap State */}
            {status === "no_gap" && (
              <div className="flex flex-col animate-in fade-in duration-300 flex-1 min-h-0 overflow-hidden">
                <div
                  className="flex-1 min-h-0 overflow-y-auto pb-6 scrollbar-styled touch-pan-y"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="w-full mb-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-4 lowercase">
                      cinda's recommendation
                    </h3>
                    <div className="relative bg-white/10 rounded-lg p-4 border border-slate-500/30 overflow-hidden">
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(110deg, transparent 20%, hsl(0 0% 100% / 0.06) 40%, hsl(0 0% 100% / 0.12) 50%, hsl(0 0% 100% / 0.06) 60%, transparent 80%)",
                          animation: "shimmer-diagonal 3s ease-in-out infinite",
                        }}
                      />
                      <p className="text-white lowercase relative z-10">
                        your rotation looks great! no obvious gaps found.
                      </p>
                    </div>
                  </div>
                  <CurrentRotationSection />
                </div>
                <div className="flex flex-col items-center pt-4 pb-4 flex-shrink-0">
                  <Button
                    onClick={handleChooseSpecific}
                    variant="cta"
                    className="w-full min-h-[44px] text-sm"
                  >
                    choose specific shoes
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300 flex-1">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-foreground mb-4 lowercase">
                    something went wrong
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8 lowercase">
                    couldn't analyse your rotation. try again or choose specific shoes instead.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    onClick={analyzeRotation}
                    variant="default"
                    className="w-full min-h-[44px] text-sm"
                  >
                    try again
                  </Button>
                  <Button
                    onClick={handleChooseSpecific}
                    variant="outline"
                    className="w-full min-h-[44px] text-sm"
                  >
                    choose specific shoes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PageTransition>
      </OnboardingLayout>
    </>
  );
};

export default ProfileBuilderStep4Analysis;
