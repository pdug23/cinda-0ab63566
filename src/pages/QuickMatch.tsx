import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Check, X } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { SelectionButton } from "@/components/SelectionButton";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { saveProfile, saveShoeRequests, clearShoes, clearGap } from "@/utils/storage";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  DiscoveryArchetype,
  FeelValue,
  HeelDropOption,
  BrandPreferenceMode,
  BrandPreference,
  FeelPreferences,
  ShoeRequest,
} from "@/contexts/ProfileContext";
import type { RunnerProfile } from "../../api/types";

// Mobile tooltip modal component
const TooltipModal = ({
  isOpen,
  onClose,
  content,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: React.ReactNode;
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-sm p-5 rounded-2xl bg-card border border-card-foreground/20 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-card-foreground/50 hover:text-card-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-sm text-card-foreground/90 leading-relaxed pr-8 pb-2">
          {content}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 text-sm font-medium rounded-lg bg-transparent border border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

// Adaptive tooltip - modal on mobile, tooltip on desktop
const AdaptiveTooltip = ({
  content,
}: {
  content: React.ReactNode;
}) => {
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const triggerButton = (
    <button
      type="button"
      onClick={() => {
        if (isMobile) {
          setIsModalOpen(true);
        } else {
          setIsTooltipOpen(!isTooltipOpen);
        }
      }}
      className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-3 text-card-foreground/40 hover:text-card-foreground/60 transition-colors"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <TooltipModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          content={content}
        />
      </>
    );
  }

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <TooltipTrigger asChild>
        {triggerButton}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

// Archetype options (same as Step4a, without "not_sure")
const ARCHETYPE_OPTIONS: { value: DiscoveryArchetype; label: string; description: string }[] = [
  { value: "daily_trainer", label: "Daily trainer", description: "A versatile shoe that handles most runs well" },
  { value: "recovery_shoe", label: "Recovery shoe", description: "Maximum comfort for easy and tired days" },
  { value: "workout_shoe", label: "Workout shoe", description: "Light and responsive for faster sessions" },
  { value: "race_shoe", label: "Race shoe", description: "Built for race day speed and efficiency" },
  { value: "trail_shoe", label: "Trail shoe", description: "Grip and protection for off-road running" },
];

// Archetype display names
const ARCHETYPE_LABELS: Record<DiscoveryArchetype, string> = {
  daily_trainer: "daily trainer",
  recovery_shoe: "recovery shoe",
  workout_shoe: "workout shoe",
  race_shoe: "race shoe",
  trail_shoe: "trail shoe",
  not_sure: "shoe",
};

// Slider configuration
interface SliderConfig {
  key: "cushionAmount" | "stabilityAmount" | "energyReturn" | "rocker";
  label: string;
  tooltip: string;
  leftLabel: string;
  middleLabel: string;
  rightLabel: string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: "cushionAmount",
    label: "Cushion amount",
    tooltip: "How much cushioning the shoe provides. Minimal offers ground feel and responsiveness. Protective provides maximum cushioning.",
    leftLabel: "Minimal",
    middleLabel: "Balanced",
    rightLabel: "Protective",
  },
  {
    key: "stabilityAmount",
    label: "Stability amount",
    tooltip: "How much guidance the shoe provides. Neutral shoes allow natural movement. Stable shoes help control motion.",
    leftLabel: "Neutral",
    middleLabel: "Balanced",
    rightLabel: "Stable",
  },
  {
    key: "energyReturn",
    label: "Energy return",
    tooltip: "How the shoe responds. Damped shoes absorb impact smoothly. Bouncy shoes feel springy and propulsive.",
    leftLabel: "Damped",
    middleLabel: "Balanced",
    rightLabel: "Bouncy",
  },
  {
    key: "rocker",
    label: "Rocker",
    tooltip: "The curved geometry of the sole. Flat shoes allow natural foot motion. Max rocker propels you forward through your stride.",
    leftLabel: "Flat",
    middleLabel: "Balanced",
    rightLabel: "Max",
  },
];

const HEEL_DROP_OPTIONS: HeelDropOption[] = ["0mm", "1-4mm", "5-8mm", "9-12mm", "13mm+"];

const BRAND_OPTIONS = [
  "Nike", "HOKA", "ASICS", "Brooks", "New Balance", "Saucony",
  "Adidas", "On", "PUMA", "Altra", "Mizuno", "Salomon"
];

// Brand preference card
const BrandPreferenceCard = ({
  preference,
  onChange,
}: {
  preference: BrandPreference;
  onChange: (pref: BrandPreference) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleModeChange = (newMode: BrandPreferenceMode) => {
    if (newMode === "all") {
      onChange({ mode: "all", brands: [] });
      setIsExpanded(false);
    } else {
      onChange({ mode: newMode, brands: [] });
    }
  };

  const handleBrandToggle = (brand: string) => {
    const newBrands = preference.brands.includes(brand)
      ? preference.brands.filter((b) => b !== brand)
      : [...preference.brands, brand];
    onChange({ mode: preference.mode, brands: newBrands });
  };

  const handleReset = () => {
    onChange({ mode: "all", brands: [] });
    setIsExpanded(false);
  };

  const getSummaryText = () => {
    if (preference.mode === "all") return "Showing all brands";
    if (preference.brands.length === 0) {
      return preference.mode === "include" ? "Select brands to show" : "Select brands to hide";
    }
    const brandList = preference.brands.join(", ");
    return preference.mode === "include" ? `Only: ${brandList}` : `Excluding: ${brandList}`;
  };

  return (
    <div className="p-4 rounded-lg bg-card-foreground/[0.02] border border-card-foreground/10">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm text-card-foreground/90">Brand preference</span>
      </div>

      {!isExpanded && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-card-foreground/50">{getSummaryText()}</span>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            {preference.mode === "all" ? "Filter" : "Edit"}
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("include")}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs rounded-md border transition-all",
                preference.mode === "include"
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  : "bg-card-foreground/5 text-card-foreground/50 border-card-foreground/20 hover:text-card-foreground/70 hover:border-card-foreground/30"
              )}
            >
              Only show
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("exclude")}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs rounded-md border transition-all",
                preference.mode === "exclude"
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  : "bg-card-foreground/5 text-card-foreground/50 border-card-foreground/20 hover:text-card-foreground/70 hover:border-card-foreground/30"
              )}
            >
              Exclude
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {BRAND_OPTIONS.map((brand) => {
              const isSelected = preference.brands.includes(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleBrandToggle(brand)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md border transition-all flex items-center gap-1.5",
                    isSelected
                      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                      : "bg-card-foreground/5 text-card-foreground/50 border-card-foreground/20 hover:text-card-foreground/70 hover:border-card-foreground/30"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {brand}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-card-foreground/40 hover:text-card-foreground/60 transition-colors"
          >
            Clear / show all brands
          </button>
        </div>
      )}
    </div>
  );
};

// State interface
interface QuickMatchState {
  selectedArchetype: DiscoveryArchetype | null;
  sliders: {
    cushionAmount: FeelValue;
    stabilityAmount: FeelValue;
    energyReturn: FeelValue;
    rocker: FeelValue;
  };
  heelDropValues: HeelDropOption[];
  brandPreference: BrandPreference;
}

const QuickMatch = () => {
  const navigate = useNavigate();
  
  const [state, setState] = useState<QuickMatchState>({
    selectedArchetype: null,
    sliders: {
      cushionAmount: 3,
      stabilityAmount: 3,
      energyReturn: 3,
      rocker: 3,
    },
    heelDropValues: [],
    brandPreference: { mode: "all", brands: [] },
  });

  const handleBack = () => {
    navigate("/");
  };

  const handleArchetypeSelect = (archetype: DiscoveryArchetype) => {
    setState((prev) => ({
      ...prev,
      selectedArchetype: archetype,
    }));
  };

  const handleSliderChange = (key: keyof QuickMatchState["sliders"], value: FeelValue) => {
    setState((prev) => ({
      ...prev,
      sliders: { ...prev.sliders, [key]: value },
    }));
  };

  const handleHeelDropToggle = (option: HeelDropOption) => {
    setState((prev) => ({
      ...prev,
      heelDropValues: prev.heelDropValues.includes(option)
        ? prev.heelDropValues.filter((v) => v !== option)
        : [...prev.heelDropValues, option],
    }));
  };

  const handleBrandChange = (pref: BrandPreference) => {
    setState((prev) => ({ ...prev, brandPreference: pref }));
  };

  const handleSubmit = () => {
    if (!state.selectedArchetype) return;

    // Build feel preferences
    const feelPreferences: FeelPreferences = {
      cushionAmount: { mode: "user_set", value: state.sliders.cushionAmount },
      stabilityAmount: { mode: "user_set", value: state.sliders.stabilityAmount },
      energyReturn: { mode: "user_set", value: state.sliders.energyReturn },
      rocker: { mode: "user_set", value: state.sliders.rocker },
      heelDropPreference: state.heelDropValues.length > 0
        ? { mode: "user_set", values: state.heelDropValues }
        : { mode: "cinda_decides" },
      brandPreference: state.brandPreference,
    };

    // Build shoe request
    const shoeRequest: ShoeRequest = {
      archetype: state.selectedArchetype,
      feelPreferences,
    };

    // Build minimal profile for API
    const minimalProfile: RunnerProfile = {
      firstName: "Quick Match",
      experience: "intermediate",
      primaryGoal: "general_fitness",
    };

    // Save to localStorage
    saveProfile(minimalProfile);
    saveShoeRequests([shoeRequest]);
    clearShoes();
    clearGap();

    // Navigate to recommendations with origin state
    navigate("/recommendations", { state: { from: "/quick-match" } });
  };

  const isSubmitEnabled = state.selectedArchetype !== null;

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout scrollable>
        <PageTransition className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-start flex-shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </header>

          {/* Scrollable content */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 pb-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Section 1: Archetype Selection */}
            <section className="mb-6">
              <p className="text-sm text-card-foreground/90 mb-4">
                What type of shoe are you looking for?
              </p>

              <div className="flex flex-col gap-3">
                {ARCHETYPE_OPTIONS.map((option) => (
                  <SelectionButton
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    selected={state.selectedArchetype === option.value}
                    onClick={() => handleArchetypeSelect(option.value)}
                  />
                ))}
              </div>
            </section>

            {/* Section 2: Feel Preferences (fades in after archetype selected) */}
            {state.selectedArchetype && (
              <section className="animate-fade-in">
                <p className="text-sm text-card-foreground/90 mb-4">
                  How do you want your {ARCHETYPE_LABELS[state.selectedArchetype]} to feel?
                </p>

                {/* Sliders */}
                <div className="space-y-4 mb-4">
                  {SLIDERS.map((config) => (
                    <div
                      key={config.key}
                      className="p-4 rounded-lg bg-card-foreground/[0.02] border border-card-foreground/10"
                    >
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-sm text-card-foreground/90">{config.label}</span>
                        <AdaptiveTooltip content={config.tooltip} />
                      </div>

                      <Slider
                        value={[state.sliders[config.key]]}
                        onValueChange={(vals) => handleSliderChange(config.key, vals[0] as FeelValue)}
                        min={1}
                        max={5}
                        step={1}
                        className={cn(
                          "w-full",
                          "[&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-[#374151]",
                          "[&_[data-slot=range]]:bg-amber-600/70",
                          "[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5",
                          "[&_[role=slider]]:bg-[#FF6B35] [&_[role=slider]]:border-0 [&_[role=slider]]:z-10",
                          "[&_[role=slider]]:relative [&_[role=slider]]:before:absolute [&_[role=slider]]:before:inset-0",
                          "[&_[role=slider]]:before:-m-5 [&_[role=slider]]:before:rounded-full",
                          "[&_[role=slider]:focus-visible]:ring-[#FF6B35]/30 [&_[role=slider]:focus-visible]:ring-offset-0"
                        )}
                      />

                      <div className="relative w-full mt-2 text-xs text-card-foreground/50">
                        <span className={cn(
                          "absolute left-0",
                          state.sliders[config.key] === 1 && "text-amber-500"
                        )}>
                          {config.leftLabel}
                        </span>
                        <span className={cn(
                          "absolute left-1/2 -translate-x-1/2",
                          state.sliders[config.key] === 3 && "text-amber-500"
                        )}>
                          {config.middleLabel}
                        </span>
                        <span className={cn(
                          "absolute right-0",
                          state.sliders[config.key] === 5 && "text-amber-500"
                        )}>
                          {config.rightLabel}
                        </span>
                        <span className="invisible">{config.middleLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Heel Drop */}
                <div className="p-4 rounded-lg bg-card-foreground/[0.02] border border-card-foreground/10 mb-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-sm text-card-foreground/90">Heel drop</span>
                    <AdaptiveTooltip content="The height difference between heel and forefoot. Lower drops encourage midfoot striking. Higher drops suit heel strikers." />
                  </div>
                  <p className="text-xs text-card-foreground/40 mb-2">Select all that apply (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {HEEL_DROP_OPTIONS.map((option) => {
                      const isSelected = state.heelDropValues.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleHeelDropToggle(option)}
                          className={cn(
                            "px-3 py-1.5 text-xs rounded-md border transition-all flex items-center gap-1.5",
                            isSelected
                              ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                              : "bg-card-foreground/5 text-card-foreground/50 border-card-foreground/20 hover:text-card-foreground/70 hover:border-card-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brand Preference */}
                <BrandPreferenceCard
                  preference={state.brandPreference}
                  onChange={handleBrandChange}
                />
              </section>
            )}
          </div>

          {/* Footer with submit button */}
          <footer className="px-6 md:px-8 pb-4 pt-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              GET RECOMMENDATIONS
            </button>
          </footer>
        </PageTransition>
      </OnboardingLayout>
    </>
  );
};

export default QuickMatch;
