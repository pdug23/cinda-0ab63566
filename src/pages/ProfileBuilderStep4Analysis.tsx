import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/AnimatedBackground";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, DiscoveryShoeRole, GapData } from "@/contexts/ProfileContext";

type Status = "loading" | "success" | "no_gap" | "error";

const ProfileBuilderStep4Analysis = () => {
  const navigate = useNavigate();
  const { profileData, updateStep4 } = useProfile();
  const { step1, step2, step3 } = profileData;
  const [status, setStatus] = useState<Status>("loading");
  const [gap, setGap] = useState<GapData | null>(null);
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
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
                <div className="text-center">
                  <h2 className="text-lg font-medium text-foreground mb-4">
                    based on your rotation, we think you need a{" "}
                    <span className="text-orange-400 font-bold">
                      {getShoeTypeLabel(mapGapToRole(gap.missingCapability || "daily"))}
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground mb-8">
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
              <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
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
