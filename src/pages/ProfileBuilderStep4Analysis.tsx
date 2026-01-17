import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader, AlertTriangle, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, DiscoveryArchetype, GapData } from "@/contexts/ProfileContext";
import { buildAPIRaceTimeFromPicker } from "@/utils/raceTime";
import { saveGap } from "@/utils/storage";

type Status = "loading" | "success" | "no_gap" | "error";

interface RotationShoeSummary {
  shoe: { shoe_id: string; full_name: string };
  userRunTypes: string[];
  archetypes: string[];
  misuseLevel: "severe" | "suboptimal" | "good";
  misuseMessage?: string;
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

const ProfileBuilderStep4Analysis = () => {
  const navigate = useNavigate();
  const { profileData, updateStep4 } = useProfile();
  const { step1, step2, step3 } = profileData;
  const [status, setStatus] = useState<Status>("loading");
  const [gap, setGap] = useState<GapData | null>(null);
  const [rotationSummary, setRotationSummary] = useState<RotationShoeSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const mapGapToArchetype = (missingCapability: string): DiscoveryArchetype => {
    const capability = missingCapability.toLowerCase();
    if (capability.includes("easy") || capability.includes("recovery")) return "recovery_shoe";
    if (capability.includes("tempo") || capability.includes("interval") || capability.includes("speed") || capability.includes("workout")) return "workout_shoe";
    if (capability.includes("race") || capability.includes("racing")) return "race_shoe";
    if (capability.includes("trail")) return "trail_shoe";
    return "daily_trainer";
  };

  const getShoeTypeLabel = (archetype: DiscoveryArchetype): string => {
    const labels: Record<DiscoveryArchetype, string> = {
      daily_trainer: "daily trainer",
      recovery_shoe: "recovery shoe",
      workout_shoe: "workout shoe",
      race_shoe: "race shoe",
      trail_shoe: "trail shoe",
      not_sure: "shoe",
    };
    return labels[archetype];
  };

  const analyzeRotation = async () => {
    setStatus("loading");
    setErrorMessage("");

    // Guard: ensure we have shoes to analyze
    if (!step3.currentShoes || step3.currentShoes.length === 0) {
      setErrorMessage("No shoes found in your rotation. Please add shoes first.");
      setStatus("error");
      return;
    }

    try {
      // Build complete profile with all fields
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

      // Include loveTags and dislikeTags on shoes
      const currentShoes = (step3.currentShoes || []).map((shoe) => ({
        shoeId: shoe.shoe.shoe_id,
        runTypes: shoe.runTypes,
        sentiment: shoe.sentiment ?? "neutral",
        loveTags: shoe.loveTags,
        dislikeTags: shoe.dislikeTags,
      }));

      // Build chatContext for API
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

      const detectedGap = data.result?.gap;
      const summary = data.result?.rotationSummary || [];
      setRotationSummary(summary);

      if (!detectedGap || detectedGap.severity === "low") {
        setStatus("no_gap");
      } else {
        setGap(detectedGap);
        updateStep4({ gap: detectedGap });
        // Save gap to localStorage so Recommendations page can load it
        saveGap(detectedGap);
        setStatus("success");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  };

  useEffect(() => {
    analyzeRotation();
  }, []);

  const handleSetPreferences = () => {
    if (!gap) return;
    const archetype = mapGapToArchetype(gap.missingCapability || "daily");
    updateStep4({
      selectedArchetypes: [archetype],
      currentArchetypeIndex: 0,
    });
    navigate("/profile/step4b");
  };

  const handleChooseSpecific = () => {
    navigate("/profile/step4a");
  };

  const RecommendationSection = () => {
    if (!gap) return null;
    
    return (
      <div className="w-full mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4 lowercase">
          cinda's recommendation
        </h3>
        <div 
          className="relative bg-transparent rounded-lg p-4 border-2 border-slate-500 overflow-hidden"
          style={{
            animation: 'border-glisten 4s ease-in-out infinite',
          }}
        >
          <p className="text-white mb-3 lowercase">
            based on your rotation, you'd benefit from a{" "}
            <span 
              className="font-bold"
              style={{
                background: 'linear-gradient(90deg, #94a3b8 0%, #94a3b8 30%, #ffffff 50%, #94a3b8 70%, #94a3b8 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'text-glisten 3s ease-in-out infinite',
              }}
            >
              {getShoeTypeLabel(mapGapToArchetype(gap.missingCapability || "daily"))}
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

  const RotationSummarySection = () => {
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
                  <p className="text-white font-medium">
                    {item.shoe.full_name}
                  </p>
                </div>
                <p className="text-sm text-gray-300 mb-1 lowercase">
                  you use it for: {(item.userRunTypes || []).map(formatRoleLabel).join(", ")}
                </p>
                <p className="text-sm text-gray-300 lowercase">
                  best suited for: {(item.archetypes || []).map(formatRoleLabel).join(", ")}
                </p>
                {isSevere && item.misuseMessage && (
                  <div className="mt-3 p-2 bg-red-500/15 border border-red-500/30 rounded-md">
                    <p className="text-sm text-red-400 lowercase">
                      {item.misuseMessage}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
              <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300 flex-1">
                <Loader className="w-8 h-8 text-primary animate-spin" />
                <div className="text-center">
                  <h2 className="text-lg font-medium text-foreground mb-2 lowercase">
                    analysing your rotation...
                  </h2>
                  <p className="text-sm text-muted-foreground lowercase">
                    this will take a few seconds
                  </p>
                </div>
              </div>
            )}

            {/* Success State - Gap Found */}
            {status === "success" && gap && (
              <div className="flex flex-col animate-in fade-in duration-300 flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto pb-6 pr-2 scrollbar-styled touch-pan-y" style={{ WebkitOverflowScrolling: "touch" }}>
                  <RecommendationSection />
                  <RotationSummarySection />
                </div>
                <div className="flex flex-col items-center pt-4 pb-4 flex-shrink-0">
                  <Button
                    onClick={handleSetPreferences}
                    variant="cta"
                    className="w-full min-h-[44px] text-sm"
                  >
                    set preferences for your new {getShoeTypeLabel(mapGapToArchetype(gap.missingCapability || "daily"))}
                  </Button>
                </div>
              </div>
            )}

            {/* No Gap State */}
            {status === "no_gap" && (
              <div className="flex flex-col animate-in fade-in duration-300 flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto pb-6 scrollbar-styled touch-pan-y" style={{ WebkitOverflowScrolling: "touch" }}>
                  <div className="w-full mb-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-4 lowercase">
                      cinda's recommendation
                    </h3>
                    <div className="relative bg-white/10 rounded-lg p-4 border border-slate-500/30 overflow-hidden">
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(110deg, transparent 20%, hsl(0 0% 100% / 0.06) 40%, hsl(0 0% 100% / 0.12) 50%, hsl(0 0% 100% / 0.06) 60%, transparent 80%)',
                          animation: 'shimmer-diagonal 3s ease-in-out infinite',
                        }}
                      />
                      <p className="text-white lowercase relative z-10">
                        your rotation looks great! no obvious gaps found.
                      </p>
                    </div>
                  </div>
                  <RotationSummarySection />
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
