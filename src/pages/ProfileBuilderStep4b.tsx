import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, DiscoveryShoeRole, FeelValue, FeelPreferencesUI, convertToRange } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Role display names
const ROLE_LABELS: Record<DiscoveryShoeRole, string> = {
  daily_trainer: "daily trainer",
  recovery: "recovery shoe",
  tempo: "tempo shoe",
  race_day: "race day shoe",
  trail: "trail shoe",
};

// Slider configuration
interface SliderConfig {
  key: keyof FeelPreferencesUI;
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
    leftLabel: "soft",
    middleLabel: "balanced",
    rightLabel: "firm",
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

// Custom slider component with "not sure" toggle
const FeelSlider = ({
  config,
  value,
  onChange,
  onToggleNotSure,
}: {
  config: SliderConfig;
  value: FeelValue | null;
  onChange: (val: FeelValue) => void;
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
  
  const { selectedRoles, currentRoleIndex, shoeRequests } = profileData.step4;
  const totalRoles = selectedRoles.length;
  const currentRole = selectedRoles[currentRoleIndex];

  // Initialize local UI state for current preferences (slider values, not ranges)
  const [preferencesUI, setPreferencesUI] = useState<FeelPreferencesUI>({
    softVsFirm: 3,
    stableVsNeutral: 3,
    bouncyVsDamped: 3,
  });

  // Update UI preferences when role changes
  useEffect(() => {
    // Reset to defaults for each new role (we don't try to reverse-engineer ranges back to slider values)
    setPreferencesUI({
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
      // Go back to role selection
      navigate("/profile/step4a");
    }
  };

  const handleSliderChange = (key: keyof FeelPreferencesUI, value: FeelValue) => {
    setPreferencesUI((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleNotSure = (key: keyof FeelPreferencesUI) => {
    setPreferencesUI((prev) => ({
      ...prev,
      [key]: prev[key] === null ? 3 : null,
    }));
  };

  const handleNext = () => {
    // Convert UI slider values to ranges for storage
    const feelPreferences = {
      softVsFirm: convertToRange(preferencesUI.softVsFirm),
      stableVsNeutral: convertToRange(preferencesUI.stableVsNeutral),
      bouncyVsDamped: convertToRange(preferencesUI.bouncyVsDamped),
    };

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
      // All roles complete - save and go to Step 5
      updateStep4({ shoeRequests: updatedRequests });
      // TODO: Navigate to Step 5 (fit sensitivities)
      console.log("All preferences complete:", updatedRequests);
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
                  value={preferencesUI[config.key]}
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
