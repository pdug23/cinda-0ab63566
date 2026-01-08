import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, DiscoveryShoeRole, FeelValue, FeelPreferences } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  key: keyof FeelPreferences;
  label: string;
  leftLabel: string;
  middleLabel: string;
  rightLabel: string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: "softVsFirm",
    label: "cushion feel",
    leftLabel: "soft & plush",
    middleLabel: "balanced",
    rightLabel: "firm & responsive",
  },
  {
    key: "stableVsNeutral",
    label: "stability",
    leftLabel: "stable & guided",
    middleLabel: "balanced",
    rightLabel: "neutral & free",
  },
  {
    key: "bouncyVsDamped",
    label: "energy return",
    leftLabel: "bouncy & springy",
    middleLabel: "balanced",
    rightLabel: "damped & smooth",
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
  onChange: (value: FeelValue) => void;
  onToggleNotSure: () => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const isDisabled = value === null;
  const displayValue = value ?? 3;

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="block text-sm text-card-foreground/90">{config.label}</label>

      {/* Slider row with "not sure" button */}
      <div className="flex items-center gap-3">
        {/* Slider container */}
        <div className={cn("relative flex-1", isDisabled && "opacity-30")}>
          <Slider
            value={[displayValue]}
            onValueChange={(vals) => {
              if (!isDisabled) onChange(vals[0] as FeelValue);
            }}
            onPointerDown={() => !isDisabled && setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            min={1}
            max={5}
            step={1}
            disabled={isDisabled}
            className={cn("w-full", isDisabled && "pointer-events-none")}
          />
          
          {/* Value indicator while dragging */}
          {isDragging && !isDisabled && (
            <div
              className="absolute -top-8 transform -translate-x-1/2 bg-orange-400 text-white text-xs font-medium px-2 py-1 rounded transition-all"
              style={{ left: `${((displayValue - 1) / 4) * 100}%` }}
            >
              {displayValue}
            </div>
          )}
        </div>

        {/* Not sure button */}
        <button
          type="button"
          onClick={onToggleNotSure}
          className={cn(
            "text-xs transition-colors italic whitespace-nowrap px-2 py-1 rounded",
            isDisabled
              ? "text-slate-400 bg-slate-500/20"
              : "text-slate-500 hover:text-slate-400"
          )}
        >
          not sure
        </button>
      </div>

      {/* Labels below slider */}
      <div className={cn(
        "flex justify-between text-xs",
        isDisabled ? "text-card-foreground/20" : "text-card-foreground/50"
      )}>
        <span className={cn(!isDisabled && value === 1 && "text-orange-400")}>{config.leftLabel}</span>
        <span className={cn(!isDisabled && value === 3 && "text-orange-400")}>{config.middleLabel}</span>
        <span className={cn(!isDisabled && value === 5 && "text-orange-400")}>{config.rightLabel}</span>
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

  // Initialize local state for current preferences
  const [preferences, setPreferences] = useState<FeelPreferences>(() => {
    // Check if we already have preferences for this role
    const existingRequest = shoeRequests.find((r) => r.role === currentRole);
    if (existingRequest) {
      return existingRequest.feelPreferences;
    }
    return {
      softVsFirm: 3,
      stableVsNeutral: 3,
      bouncyVsDamped: 3,
    };
  });

  // Update preferences when role changes
  useEffect(() => {
    const existingRequest = shoeRequests.find((r) => r.role === currentRole);
    if (existingRequest) {
      setPreferences(existingRequest.feelPreferences);
    } else {
      setPreferences({
        softVsFirm: 3,
        stableVsNeutral: 3,
        bouncyVsDamped: 3,
      });
    }
  }, [currentRole, shoeRequests]);

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

  const handleSliderChange = (key: keyof FeelPreferences, value: FeelValue) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleNotSure = (key: keyof FeelPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: prev[key] === null ? 3 : null,
    }));
  };

  const handleNext = () => {
    // Save current preferences
    const newRequest = { role: currentRole, feelPreferences: preferences };
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
          <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              back
            </button>
            <span className="text-xs text-card-foreground/50">step 4 of 4</span>
          </header>

          {/* Scrollable content */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 pb-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Heading */}
            <p className="text-sm text-card-foreground/90 mb-2">
              how do you want your {ROLE_LABELS[currentRole]} to feel?
            </p>

            {/* Progress indicator for multiple roles */}
            {totalRoles > 1 && (
              <p className="text-xs text-card-foreground/40 mb-6">
                shoe {currentRoleIndex + 1} of {totalRoles}
              </p>
            )}

            {/* Sliders */}
            <div className="flex flex-col gap-8 mt-6">
              {SLIDERS.map((config) => (
                <FeelSlider
                  key={config.key}
                  config={config}
                  value={preferences[config.key]}
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
