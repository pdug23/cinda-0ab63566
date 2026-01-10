import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, DiscoveryShoeRole, FeelValue, FeelPreferences } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { saveProfile, saveShoes, saveShoeRequests, saveGap } from "@/utils/storage";

// Role display names
const ROLE_LABELS: Record<DiscoveryShoeRole, string> = {
  daily_trainer: "daily trainer",
  recovery: "recovery shoe",
  tempo: "tempo shoe",
  race_day: "race day shoe",
  trail: "trail shoe",
  not_sure: "shoe",
};

// Slider configuration
interface SliderConfig {
  key: keyof FeelPreferences;
  label: string;
  tooltip: string;
  leftLabel: string;
  middleLabel: string;
  rightLabel: string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: "softVsFirm",
    label: "cushioning",
    tooltip: "how soft the midsole feels. soft provides plush comfort for easy miles. firm provides stable support for faster efforts.",
    leftLabel: "max stack",
    middleLabel: "balanced",
    rightLabel: "minimal",
  },
  {
    key: "stableVsNeutral",
    label: "stability",
    tooltip: "how much guidance the shoe provides. stable shoes help control motion. neutral shoes allow natural movement.",
    leftLabel: "stable",
    middleLabel: "balanced",
    rightLabel: "neutral",
  },
  {
    key: "bouncyVsDamped",
    label: "energy return",
    tooltip: "how the shoe responds. bouncy shoes feel springy and propulsive. damped shoes absorb impact smoothly.",
    leftLabel: "bouncy",
    middleLabel: "balanced",
    rightLabel: "damped",
  },
];

/**
 * Convert slider value to range for flexible backend matching
 * Range logic:
 * - 1 → [1, 2] (extreme: very soft/stable/bouncy - narrow range)
 * - 2 → [1, 2, 3] (soft/stable/bouncy side - wider range)
 * - 3 → [2, 3, 4] (balanced - exclude extremes)
 * - 4 → [3, 4, 5] (firm/neutral/damped side - wider range)
 * - 5 → [4, 5] (extreme: very firm/neutral/damped - narrow range)
 * - null (not sure) → [2, 3, 4] (exclude extremes)
 */
function convertToRange(value: FeelValue | null): number[] {
  if (value === null) {
    return [2, 3, 4]; // "Not sure" - exclude extremes
  }

  switch (value) {
    case 1: return [1, 2];       // Very soft/stable/bouncy
    case 2: return [1, 2, 3];    // Soft/stable/bouncy side
    case 3: return [2, 3, 4];    // Balanced (exclude extremes)
    case 4: return [3, 4, 5];    // Firm/neutral/damped side
    case 5: return [4, 5];       // Very firm/neutral/damped
    default: return [2, 3, 4];   // Fallback: exclude extremes
  }
}

// Custom slider component with "not sure" toggle
const FeelSlider = ({
  config,
  value,
  onChange,
  onToggleNotSure,
}: {
  config: SliderConfig;
  value: FeelValue | null;
  onChange: (value: FeelValue) => void;
  onToggleNotSure: () => void;
}) => {
  const isDisabled = value === null;
  const displayValue = value ?? 3;

  return (
    <div className="space-y-3">
      {/* Label with tooltip */}
      <div className="flex items-center gap-1.5">
        <label className="text-sm text-card-foreground/90">{config.label}</label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-card-foreground/40 hover:text-card-foreground/60 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs">
            {config.tooltip}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Slider row with "not sure" button */}
      <div className="flex items-center gap-4">
        {/* Slider container with labels */}
        <div
          className={cn("relative flex-1", isDisabled && "opacity-30 cursor-pointer")}
          onClick={() => {
            // Re-enable slider by clicking the track area
            if (isDisabled) onToggleNotSure();
          }}
        >
          <Slider
            value={[displayValue]}
            onValueChange={(vals) => {
              if (!isDisabled) onChange(vals[0] as FeelValue);
            }}
            min={1}
            max={5}
            step={1}
            disabled={isDisabled}
            className={cn("w-full", isDisabled && "pointer-events-none")}
          />

          {/* Labels positioned below slider - aligned to slider positions */}
          <div className={cn(
            "relative w-full mt-2 text-xs",
            isDisabled ? "text-card-foreground/20" : "text-card-foreground/50"
          )}>
            {/* Left label - position 1 (0%) */}
            <span className={cn(
              "absolute left-0 -translate-x-0",
              !isDisabled && value === 1 && "text-orange-400"
            )}>
              {config.leftLabel}
            </span>
            {/* Middle label - position 3 (50%) */}
            <span className={cn(
              "absolute left-1/2 -translate-x-1/2",
              !isDisabled && value === 3 && "text-orange-400"
            )}>
              {config.middleLabel}
            </span>
            {/* Right label - position 5 (100%) */}
            <span className={cn(
              "absolute right-0 translate-x-0",
              !isDisabled && value === 5 && "text-orange-400"
            )}>
              {config.rightLabel}
            </span>
            {/* Spacer for height */}
            <span className="invisible">{config.middleLabel}</span>
          </div>
        </div>

        {/* Not sure button - more prominent */}
        <button
          type="button"
          onClick={onToggleNotSure}
          className={cn(
            "text-xs transition-all italic whitespace-nowrap px-3 py-1.5 rounded-md border self-start mt-0",
            isDisabled
              ? "text-slate-300 bg-slate-500/20 border-slate-400/40"
              : "text-slate-500 border-slate-500/30 hover:text-slate-400 hover:border-slate-400/50 hover:bg-slate-500/10"
          )}
        >
          not sure
        </button>
      </div>
    </div>
  );
};

const ProfileBuilderStep4b = () => {
  const navigate = useNavigate();
  const { profileData, updateStep4 } = useProfile();

  const { step1, step2, step3 } = profileData;
  const { selectedRoles, currentRoleIndex, shoeRequests } = profileData.step4;
  const totalRoles = selectedRoles.length;
  const currentRole = selectedRoles[currentRoleIndex];

  // Initialize local state for current slider values (before conversion to ranges)
  const [sliderValues, setSliderValues] = useState<{
    softVsFirm: FeelValue | null;
    stableVsNeutral: FeelValue | null;
    bouncyVsDamped: FeelValue | null;
  }>(() => {
    // Default to middle values
    return {
      softVsFirm: 3,
      stableVsNeutral: 3,
      bouncyVsDamped: 3,
    };
  });

  // Reset slider values when role changes
  useEffect(() => {
    // Reset to defaults when switching roles
    setSliderValues({
      softVsFirm: 3,
      stableVsNeutral: 3,
      bouncyVsDamped: 3,
    });
  }, [currentRole]);

  // Redirect if no roles selected
  useEffect(() => {
    if (selectedRoles.length === 0) {
      navigate("/profile/step4a");
    }
  }, [selectedRoles, navigate]);

  const handleBack = () => {
    if (currentRoleIndex > 0) {
      // Go to previous role
      updateStep4({ currentRoleIndex: currentRoleIndex - 1 });
    } else {
      // First role - check mode to determine where to go
      const mode = profileData.step4.mode;
      if (mode === "analysis") {
        // Analysis mode: go back to mode selection (skip gap detection page)
        navigate("/profile/step4");
      } else {
        // Shopping/discovery mode: go back to role selection
        navigate("/profile/step4a");
      }
    }
  };

  const handleSliderChange = (key: "softVsFirm" | "stableVsNeutral" | "bouncyVsDamped", value: FeelValue) => {
    setSliderValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleNotSure = (key: "softVsFirm" | "stableVsNeutral" | "bouncyVsDamped") => {
    setSliderValues((prev) => ({
      ...prev,
      [key]: prev[key] === null ? 3 : null,
    }));
  };

  const handleNext = () => {
    // Convert slider values to ranges for backend
    const feelPreferences: FeelPreferences = {
      softVsFirm: convertToRange(sliderValues.softVsFirm),
      stableVsNeutral: convertToRange(sliderValues.stableVsNeutral),
      bouncyVsDamped: convertToRange(sliderValues.bouncyVsDamped),
    };

    // Save current preferences as range-based request
    const newRequest = { role: currentRole, feelPreferences };
    const existingIndex = shoeRequests.findIndex((r) => r.role === currentRole);

    let updatedRequests: typeof shoeRequests;
    if (existingIndex >= 0) {
      updatedRequests = [...shoeRequests];
      updatedRequests[existingIndex] = newRequest;
    } else {
      updatedRequests = [...shoeRequests, newRequest];
    }

    if (currentRoleIndex < totalRoles - 1) {
      // More roles to go - save and move to next
      updateStep4({
        shoeRequests: updatedRequests,
        currentRoleIndex: currentRoleIndex + 1,
      });
    } else {
      // All roles complete - save to context and localStorage, then navigate to recommendations
      updateStep4({ shoeRequests: updatedRequests });

      // Save to localStorage for recommendations page
      try {
        // Save profile data
        const profile = {
          firstName: step1.firstName,
          age: step1.age ? parseInt(step1.age) : undefined,
          height: step1.heightCm ?? undefined,
          weight: step1.weightKg ?? undefined,
          experience: step1.experience!,
          primaryGoal: step2.primaryGoal!,
          runningPattern: step2.runningPattern ?? undefined,
          doesTrail: step2.doesTrail ?? false,
          weeklyVolume: step2.weeklyVolume ? {
            value: step2.weeklyVolume.value,
            unit: step2.weeklyVolume.unit
          } : undefined,
          pbs: {
            mile: step2.personalBests.mile ?? undefined,
            fiveK: step2.personalBests["5k"] ?? undefined,
            tenK: step2.personalBests["10k"] ?? undefined,
            half: step2.personalBests.half ?? undefined,
            marathon: step2.personalBests.marathon ?? undefined,
          },
        };
        saveProfile(profile as any);  // Uses storage utility with proper format

        // Save current shoes
        const currentShoes = step3.currentShoes.map((shoe) => ({
          shoe: shoe.shoe,  // Save full shoe object, not just ID
          roles: shoe.roles,
          sentiment: shoe.sentiment ?? "neutral",
        }));
        saveShoes(currentShoes as any);  // Uses storage utility with proper format

        // Save shoe requests for shopping mode
        saveShoeRequests(updatedRequests);

        // Save gap if in analysis mode
        if (profileData.step4.gap) {
          saveGap(profileData.step4.gap);
        }

        console.log("All preferences complete. Navigating to recommendations...");
        navigate("/recommendations");
      } catch (error) {
        console.error("Error saving to localStorage:", error);
        // Navigate anyway - recommendations page will handle missing data
        navigate("/recommendations");
      }
    }
  };

  if (!currentRole) {
    return null;
  }

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable>
        <PageTransition className="flex flex-col flex-1 min-h-0">
          {/* Card header */}
          <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-start flex-shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              back
            </button>
          </header>

          {/* Scrollable content */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 pb-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Heading */}
            <p className="text-sm text-card-foreground/90 mb-2">
              how do you want your <span className="text-orange-400 font-semibold">{ROLE_LABELS[currentRole]}</span> to feel?
            </p>

            {/* Progress indicator for multiple roles */}
            {totalRoles > 1 && (
              <p className="text-xs text-card-foreground/40 mb-6">
                shoe {currentRoleIndex + 1} of {totalRoles}
              </p>
            )}

            {/* Sliders - increased spacing */}
            <div className="flex flex-col gap-10 mt-6">
              {SLIDERS.map((config) => (
                <FeelSlider
                  key={config.key}
                  config={config}
                  value={sliderValues[config.key]}
                  onChange={(val) => handleSliderChange(config.key, val)}
                  onToggleNotSure={() => handleToggleNotSure(config.key)}
                />
              ))}
            </div>
          </div>

          {/* Footer with next button */}
          <footer className="px-6 md:px-8 pb-4 pt-2 flex-shrink-0">
            <Button
              onClick={handleNext}
              variant="cta"
              className="w-full min-h-[44px] text-sm"
            >
              next
            </Button>
          </footer>
        </PageTransition>
      </OnboardingLayout>
    </>
  );
};

export default ProfileBuilderStep4b;
