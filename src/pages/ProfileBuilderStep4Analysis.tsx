import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, ArrowLeft, ChevronDown, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, DiscoveryArchetype, GapData, FeelGapInfo, ContrastProfile } from "@/contexts/ProfileContext";
import { buildAPIRaceTimeFromPicker } from "@/utils/raceTime";
import { saveGap } from "@/utils/storage";
import { cn } from "@/lib/utils";
import { CindaLogoLoader } from "@/components/CindaLogoLoader";

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
    primary: { 
      archetype: string; 
      reason: string;
      feelGap?: FeelGapInfo;
      contrastWith?: ContrastProfile;
    };
    secondary?: { 
      archetype: string; 
      reason: string;
      feelGap?: FeelGapInfo;
      contrastWith?: ContrastProfile;
    };
  };
  health: Record<string, number>;
}

const formatRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    daily: "Daily training",
    tempo: "Tempo",
    intervals: "Intervals",
    easy: "Easy pace",
    race: "Races",
    trail: "Trail",
    long_runs: "Long runs",
    recovery: "Recovery",
  };
  return labels[role] || role.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
};

const formatArchetypesToRunTypes = (archetypes: string[]): string => {
  if (!archetypes || archetypes.length === 0) return "";

  const runTypeMap: Record<string, string[]> = {
    daily_trainer: ["Recovery runs", "Long runs at a comfortable pace"],
    recovery_shoe: ["Recovery runs"],
    workout_shoe: ["Workouts", "Long runs with workout segments"],
    race_shoe: ["Races", "Workouts", "Long runs with workout segments"],
    trail_shoe: ["Trail"],
  };

  const allRunTypes: string[] = [];
  archetypes.forEach((archetype) => {
    const types = runTypeMap[archetype] || [];
    allRunTypes.push(...types);
  });

  const hasComfortablePace = allRunTypes.includes("Long runs at a comfortable pace");
  const hasWorkoutSegments = allRunTypes.includes("Long runs with workout segments");

  let finalTypes: string[];
  if (hasComfortablePace && hasWorkoutSegments) {
    finalTypes = allRunTypes.filter(
      (t) => t !== "Long runs at a comfortable pace" && t !== "Long runs with workout segments"
    );
    finalTypes.push("All long runs");
  } else {
    finalTypes = [...allRunTypes];
  }

  const unique = [...new Set(finalTypes)];
  return unique.join(", ");
};

const formatArchetype = (archetype: string): string => {
  const labels: Record<string, string> = {
    daily_trainer: "Daily trainer",
    recovery_shoe: "Recovery shoe",
    workout_shoe: "Workout shoe",
    race_shoe: "Race shoe",
    trail_shoe: "Trail shoe",
  };
  return labels[archetype] || archetype.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
};

// Tier config kept for potential future use but currently not shown
const TIER_CONFIG = {
  1: { label: "Priority", className: "bg-red-500/20 text-red-400 border-red-500/40" },
  2: { label: "Recommended", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  3: { label: "Explore", className: "bg-teal-500/20 text-teal-400 border-teal-500/40" },
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
  const [removalTarget, setRemovalTarget] = useState<string | null>(null);

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
        
        // Store full recommendations including feelGap/contrastWith for Step 4b
        updateStep4({
          analysisRecommendations: {
            primary: analysisData.recommendations.primary,
            secondary: analysisData.recommendations.secondary,
          }
        });
        
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
      return "Explore these options";
    }
    if (selectedArchetypes.length === 2) {
      return "Set preferences for your new shoes";
    }
    return `Set preferences for your new ${formatArchetype(selectedArchetypes[0]).toLowerCase()}`;
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
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          Cinda's recommendation
        </h3>
        <div
          className="relative bg-transparent rounded-lg p-4 border-2 border-slate-500 overflow-hidden"
          style={{ animation: "border-glisten 4s ease-in-out infinite" }}
        >
          <p className="text-white mb-3">
            Based on your rotation, you'd benefit from a{" "}
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
              {formatArchetype(gap.recommendedArchetype || "daily_trainer").toLowerCase()}
            </span>
          </p>
          {gap.reasoning && (
            <p className="text-sm text-gray-300 relative z-10">
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
        <div className="bg-card/80 rounded-lg p-4 border-2 border-slate-500/50">
          <p className="text-sm text-white/90 leading-relaxed">
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
            You could explore a{" "}
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
              {formatArchetype(archetype).toLowerCase()}
            </span>
          </>
        );
      }
      return (
        <>
          You'd benefit from a{" "}
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
            {formatArchetype(archetype).toLowerCase()}
          </span>
        </>
      );
    };

    // Single recommendation (no pills needed)
    if (!hasSecondary) {
      return (
        <div className="w-full mb-4">
          <div className="bg-card/80 rounded-lg p-4 border-2 border-slate-500/50">
            <p className="text-white mb-3">
              {getIntroText(primary.archetype)}
            </p>
            <p className="text-sm text-gray-300">
              {primary.reason}
            </p>
          </div>
        </div>
      );
    }

    // Handle confirmation of removal
    const handleConfirmRemoval = () => {
      if (removalTarget) {
        handleToggleArchetype(removalTarget);
        setRemovalTarget(null);
      }
    };

    // Remove button (X icon)
    const RemoveButton = ({
      onRemove,
      canRemove,
    }: {
      onRemove: () => void;
      canRemove: boolean;
    }) => (
      <button
        onClick={onRemove}
        disabled={!canRemove}
        className={cn(
          "w-6 h-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0",
          "bg-transparent border-slate-600 text-slate-400",
          canRemove && "hover:border-red-500/60 hover:text-red-400",
          !canRemove && "opacity-40 cursor-not-allowed"
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    );

    // Add back button (+ icon)
    const AddBackButton = ({ onAdd }: { onAdd: () => void }) => (
      <button
        onClick={onAdd}
        className="w-6 h-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0 bg-transparent border-slate-500 text-slate-400 hover:border-primary/60 hover:text-primary"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    );

    // Collapsed summary for removed recommendation
    const CollapsedRecommendation = ({
      archetype,
      onAdd,
    }: {
      archetype: string;
      onAdd: () => void;
    }) => (
      <div className="bg-card/40 rounded-lg px-4 py-3 border border-slate-600/30 opacity-60">
        <div className="flex items-center justify-between gap-3">
          <p className="text-slate-400 text-sm">
            {tier === 3 ? "You could explore a " : "You'd benefit from a "}
            <span className="font-medium">{formatArchetype(archetype).toLowerCase()}</span>
          </p>
          <AddBackButton onAdd={onAdd} />
        </div>
      </div>
    );

    // Two recommendations with X/+ remove/add pattern
    return (
      <div className="w-full mb-4 flex flex-col gap-3">
        {/* Primary recommendation */}
        {primaryIncluded ? (
          <div className="bg-card/80 rounded-lg p-4 border-2 border-slate-500/50 transition-all">
            <div className="flex items-start justify-between gap-3">
              <p className="text-white">
                {getIntroText(primary.archetype)}
              </p>
              <RemoveButton
                onRemove={() => setRemovalTarget(primary.archetype)}
                canRemove={canSkipPrimary}
              />
            </div>
            <p className="text-sm text-gray-300 mt-3">{primary.reason}</p>
          </div>
        ) : (
          <CollapsedRecommendation
            archetype={primary.archetype}
            onAdd={() => handleToggleArchetype(primary.archetype)}
          />
        )}

        {/* Secondary recommendation */}
        {secondaryIncluded ? (
          <div className="bg-card/80 rounded-lg p-4 border-2 border-slate-500/50 transition-all">
            <div className="flex items-start justify-between gap-3">
              <p className="text-white">
                {getIntroText(secondary.archetype)}
              </p>
              <RemoveButton
                onRemove={() => setRemovalTarget(secondary.archetype)}
                canRemove={canSkipSecondary}
              />
            </div>
            <p className="text-sm text-gray-300 mt-3">{secondary.reason}</p>
          </div>
        ) : (
          <CollapsedRecommendation
            archetype={secondary.archetype}
            onAdd={() => handleToggleArchetype(secondary.archetype)}
          />
        )}

        {/* Remove confirmation modal */}
        <Dialog open={!!removalTarget} onOpenChange={() => setRemovalTarget(null)}>
          <DialogContent className="max-w-sm bg-card border-border/20 p-0 gap-0">
            <DialogHeader className="p-4 pb-0">
              <DialogTitle className="text-card-foreground">Remove this recommendation?</DialogTitle>
            </DialogHeader>
            <div className="px-4 pt-4 pb-6">
              <p className="text-sm text-card-foreground/70">
                You can add it back at any time.
              </p>
            </div>
            <div className="flex gap-3 p-4 pt-0">
              <button
                onClick={() => setRemovalTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary hover:bg-primary/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoval}
                className="flex-1 px-4 py-2 rounded-lg border border-border/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary hover:bg-primary/5"
              >
                Remove
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Note: Old RecommendationCard and RecommendationsSection removed - now using RecommendationBoxSection

  const CurrentRotationSection = () => {
    if (!rotationSummary || rotationSummary.length === 0) return null;

    return (
      <div className="w-full mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          Your current rotation
        </h3>
        <div className="flex flex-col gap-2">
          {rotationSummary.map((item, index) => {
            const isSevere = item.misuseLevel === "severe";

            return (
              <Collapsible key={item.shoe.shoe_id || index} className="group">
                <div
                  className={cn(
                    "bg-card/80 rounded-lg border-2 transition-all",
                    isSevere ? "border-red-500/60" : "border-green-500/60"
                  )}
                >
                  {/* Collapsed header - always visible */}
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      {isSevere ? (
                        <AlertTriangle className="w-4 h-4 text-red-500/80 flex-shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500/80 flex-shrink-0" />
                      )}
                      <p className="text-white font-medium text-left">{item.shoe.full_name}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  
                  {/* Expanded content - hidden by default */}
                  <CollapsibleContent className="px-4 pb-4">
                    <p className="text-sm text-gray-300 mb-1">
                      You use it for: {(item.userRunTypes || []).map(formatRoleLabel).join(", ").toLowerCase()}
                    </p>
                    <p className="text-sm text-gray-300">
                      Best suited for: {formatArchetypesToRunTypes(item.archetypes || []).toLowerCase()}
                    </p>
                    {isSevere && item.misuseMessage && (
                      <div className="mt-3 p-2 bg-red-500/15 border border-red-500/30 rounded-md">
                        <p className="text-sm text-red-400">{item.misuseMessage}</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    );
  };

  // Loading state now uses CindaLogoLoader instead of skeleton

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable invisible={status === "loading"}>
        <PageTransition className="flex flex-col flex-1 min-h-0">
          {/* Card header with back button */}
          <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-start flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate("/profile/step4")}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </header>
          <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 px-6 md:px-8">
            {/* Loading State */}
            {status === "loading" && (
              <div className="flex flex-col items-center justify-center animate-in fade-in duration-300 flex-1">
                <CindaLogoLoader />
              </div>
            )}

            {/* Success State - New Analysis Structure */}
            {status === "success" && analysis && (
              <div className="flex flex-col animate-in fade-in duration-300 flex-1 min-h-0 overflow-hidden">
                <div
                  className="flex-1 min-h-0 overflow-y-auto pb-6 pr-2 scrollbar-styled touch-pan-y"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {/* Order: Recommendation → Summary → Current Rotation */}
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
                      className="mt-4 text-sm text-slate-400 hover:text-slate-300 underline underline-offset-4 decoration-dotted"
                    >
                      I'm happy with my rotation
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
                    Set preferences for your new {formatArchetype(gap.recommendedArchetype || "daily_trainer").toLowerCase()}
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
                    <h3 className="text-sm font-medium text-slate-400 mb-4">
                      Cinda's recommendation
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
                      <p className="text-white relative z-10">
                        Your rotation looks great! No obvious gaps found.
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
                    Choose specific shoes
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300 flex-1">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-foreground mb-4">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8">
                    Couldn't analyse your rotation. Try again or choose specific shoes instead.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    onClick={analyzeRotation}
                    variant="default"
                    className="w-full min-h-[44px] text-sm"
                  >
                    Try again
                  </Button>
                  <Button
                    onClick={handleChooseSpecific}
                    variant="outline"
                    className="w-full min-h-[44px] text-sm"
                  >
                    Choose specific shoes
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
