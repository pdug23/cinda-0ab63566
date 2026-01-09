import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, DiscoveryShoeRole, GapData } from "@/contexts/ProfileContext";

type Status = "loading" | "success" | "no_gap" | "error";

interface RotationShoeSummary {
  shoe: { shoe_id: string; full_name: string };
  userRoles: string[];
  capabilities: string[];
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

  const mapGapToRole = (missingCapability: string): DiscoveryShoeRole => {
    const capability = missingCapability.toLowerCase();
    if (capability.includes("easy") || capability.includes("recovery")) return "recovery";
    if (capability.includes("tempo") || capability.includes("interval") || capability.includes("speed")) return "tempo";
    if (capability.includes("race") || capability.includes("racing")) return "race_day";
    if (capability.includes("trail")) return "trail";
    return "daily_trainer";
  };

  const getShoeTypeLabel = (role: DiscoveryShoeRole): string => {
    const labels: Record<DiscoveryShoeRole, string> = {
      daily_trainer: "daily trainer",
      recovery: "recovery shoe",
      tempo: "tempo shoe",
      race_day: "race day shoe",
      trail: "trail shoe",
      not_sure: "shoe",
    };
    return labels[role];
  };

  const analyzeRotation = async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const profile = {
        firstName: step1.firstName,
        age: step1.age ? parseInt(step1.age) : undefined,
        height: step1.heightCm ?? undefined,
        weight: step1.weightKg ?? undefined,
        experience: step1.experience!,
        primaryGoal: step2.primaryGoal!,
        runningPattern: step2.runningPattern ?? undefined,
        pbs: {
          mile: step2.personalBests.mile ?? undefined,
          fiveK: step2.personalBests["5k"] ?? undefined,
          tenK: step2.personalBests["10k"] ?? undefined,
          half: step2.personalBests.half ?? undefined,
          marathon: step2.personalBests.marathon ?? undefined,
        },
      };

      const currentShoes = step3.currentShoes.map((shoe) => ({
        shoeId: shoe.shoe.shoe_id,
        roles: shoe.roles,
        sentiment: shoe.sentiment ?? "neutral",
      }));

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "gap_detection",
          profile,
          currentShoes,
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
    const role = mapGapToRole(gap.missingCapability || "daily");
    updateStep4({
      selectedRoles: [role],
      currentRoleIndex: 0,
    });
    navigate("/profile/step4b");
  };

  const handleChooseSpecific = () => {
    navigate("/profile/step4a");
  };

  const RotationSummarySection = () => {
    if (rotationSummary.length === 0) return null;

    return (
      <div className="w-full mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
          your current rotation
        </h3>
        <div className="flex flex-col gap-3">
          {rotationSummary.map((item, index) => (
            <div
              key={item.shoe.shoe_id || index}
              className={`bg-card/50 border rounded-lg p-4 ${
                item.misuseLevel === "severe"
                  ? "border-l-4 border-l-orange-500 border-orange-500/30"
                  : "border-border/50"
              }`}
            >
              <p className="text-foreground font-medium mb-2 lowercase">
                {item.shoe.full_name}
              </p>
              <p className="text-sm text-muted-foreground mb-1 lowercase">
                you use it for: {item.userRoles.map(formatRoleLabel).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground lowercase">
                best suited for: {item.capabilities.map(formatRoleLabel).join(", ")}
              </p>
              {item.misuseLevel === "severe" && item.misuseMessage && (
                <div className="flex items-start gap-2 mt-3 p-2 bg-orange-500/10 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-400 lowercase">
                    {item.misuseMessage}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout>
        <PageTransition>
          <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[400px]">
            {/* Loading State */}
            {status === "loading" && (
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
                <Loader className="w-8 h-8 text-orange-400 animate-spin" />
                <div className="text-center">
                  <h2 className="text-lg font-medium text-foreground mb-2">
                    analysing your rotation...
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    this will take a few seconds
                  </p>
                </div>
              </div>
            )}

            {/* Success State - Gap Found */}
            {status === "success" && gap && (
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300 text-center w-full">
                <RotationSummarySection />
                <div className="w-full">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    cinda's recommendation
                  </h3>
                  <h2 className="text-lg font-medium text-card-foreground mb-4">
                    based on your rotation, we think you need a{" "}
                    <span className="text-orange-400 font-bold">
                      {getShoeTypeLabel(mapGapToRole(gap.missingCapability || "daily"))}
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8 lowercase">
                    {gap.reasoning}
                  </p>
                </div>
                <Button
                  onClick={handleSetPreferences}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  set preferences for this shoe
                </Button>
              </div>
            )}

            {/* No Gap State */}
            {status === "no_gap" && (
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300 w-full">
                <RotationSummarySection />
                <div className="text-center">
                  <h2 className="text-lg font-medium text-foreground mb-4">
                    your rotation looks great!
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8">
                    no obvious gaps found. want to add a specific shoe type instead?
                  </p>
                </div>
                <Button
                  onClick={handleChooseSpecific}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  choose specific shoes
                </Button>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-foreground mb-4">
                    something went wrong
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8">
                    couldn't analyse your rotation. try again or choose specific shoes instead.
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    onClick={analyzeRotation}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    try again
                  </Button>
                  <Button
                    onClick={handleChooseSpecific}
                    variant="outline"
                    className="w-full"
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
