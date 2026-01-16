import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, Check, X } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { 
  useProfile, 
  DiscoveryArchetype, 
  FeelValue, 
  FeelPreferences,
  PreferenceMode,
  SliderPreference,
  HeelDropPreference,
  HeelDropOption,
  BrandPreference,
  BrandPreferenceMode
} from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { saveProfile, saveShoes, saveShoeRequests, saveGap } from "@/utils/storage";
import { useIsMobile } from "@/hooks/use-mobile";

// Mobile tooltip modal component - proper centered modal with backdrop
const TooltipModal = ({
  isOpen,
  onClose,
  content,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: React.ReactNode;
}) => {
  // Prevent body scroll when modal is open
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal content */}
      <div 
        className="relative w-full max-w-sm p-5 rounded-2xl bg-card border border-card-foreground/20 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-card-foreground/50 hover:text-card-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Content */}
        <div className="text-sm text-card-foreground/90 leading-relaxed pr-8 pb-2">
          {content}
        </div>
        
        {/* Got it button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 text-sm font-medium rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
        >
          got it
        </button>
      </div>
    </div>
  );
};

// Adaptive tooltip button - modal on mobile, tooltip on desktop
const AdaptiveTooltip = ({
  content,
  children,
}: {
  content: React.ReactNode;
  children?: React.ReactNode;
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
    label: "cushion amount",
    tooltip: "how much cushioning the shoe provides. minimal offers ground feel and responsiveness. protective provides maximum cushioning.",
    leftLabel: "minimal",
    middleLabel: "balanced",
    rightLabel: "protective",
  },
  {
    key: "stabilityAmount",
    label: "stability amount",
    tooltip: "how much guidance the shoe provides. neutral shoes allow natural movement. stable shoes help control motion.",
    leftLabel: "neutral",
    middleLabel: "balanced",
    rightLabel: "stable",
  },
  {
    key: "energyReturn",
    label: "energy return",
    tooltip: "how the shoe responds. damped shoes absorb impact smoothly. bouncy shoes feel springy and propulsive.",
    leftLabel: "damped",
    middleLabel: "balanced",
    rightLabel: "bouncy",
  },
  {
    key: "rocker",
    label: "rocker",
    tooltip: "the curved geometry of the sole. flat shoes allow natural foot motion. max rocker propels you forward through your stride.",
    leftLabel: "flat",
    middleLabel: "balanced",
    rightLabel: "max",
  },
];

const HEEL_DROP_OPTIONS: HeelDropOption[] = ["0mm", "1-4mm", "5-8mm", "9-12mm", "13mm+"];

// Mode button component
const ModeSelector = ({
  mode,
  onChange,
}: {
  mode: PreferenceMode;
  onChange: (mode: PreferenceMode) => void;
}) => {
  const modes: { value: PreferenceMode; label: string }[] = [
    { value: "cinda_decides", label: "let cinda decide" },
    { value: "user_set", label: "i have a preference" },
    { value: "wildcard", label: "i don't mind" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-md border transition-all",
            mode === m.value
              ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
              : "bg-card-foreground/5 text-card-foreground/50 border-card-foreground/20 hover:text-card-foreground/70 hover:border-card-foreground/30"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};

// Preference card for sliders
const SliderPreferenceCard = ({
  config,
  preference,
  onChange,
}: {
  config: SliderConfig;
  preference: SliderPreference;
  onChange: (pref: SliderPreference) => void;
}) => {
  const showSlider = preference.mode === "user_set";
  const sliderValue = preference.value ?? 3;

  const handleModeChange = (mode: PreferenceMode) => {
    if (mode === "user_set") {
      onChange({ mode, value: preference.value ?? 3 });
    } else {
      onChange({ mode });
    }
  };

  const handleSliderChange = (value: FeelValue) => {
    onChange({ mode: "user_set", value });
  };

  return (
    <div className="p-4 rounded-lg bg-card-foreground/[0.02] border border-card-foreground/10">
      {/* Label with tooltip */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm text-card-foreground/90">{config.label}</span>
        <AdaptiveTooltip content={config.tooltip} />
      </div>

      {/* Mode selector */}
      <ModeSelector mode={preference.mode} onChange={handleModeChange} />

      {/* Slider (only shown when "i have a preference") */}
      {showSlider && (
        <div className="mt-4">
          <Slider
            value={[sliderValue]}
            onValueChange={(vals) => handleSliderChange(vals[0] as FeelValue)}
            min={1}
            max={5}
            step={1}
            className={cn(
              "w-full",
              // Track styling - thinner, softer colors
              "[&_[data-slot=track]]:h-1 [&_[data-slot=track]]:bg-[#374151]",
              // Filled range - softer amber
              "[&_[data-slot=range]]:bg-amber-600/70",
              // Handle styling - solid filled circle, fully opaque, on top
              // Visual size stays small but touch target is 44x44px for mobile UX
              "[&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5",
              "[&_[role=slider]]:bg-[#FF6B35] [&_[role=slider]]:border-0 [&_[role=slider]]:z-10",
              "[&_[role=slider]]:relative [&_[role=slider]]:before:absolute [&_[role=slider]]:before:inset-0",
              "[&_[role=slider]]:before:-m-5 [&_[role=slider]]:before:rounded-full",
              // Active/focus state
              "[&_[role=slider]:focus-visible]:ring-[#FF6B35]/30 [&_[role=slider]:focus-visible]:ring-offset-0"
            )}
          />

          {/* Labels */}
          <div className="relative w-full mt-2 text-xs text-card-foreground/50">
            <span className={cn(
              "absolute left-0",
              sliderValue === 1 && "text-amber-500"
            )}>
              {config.leftLabel}
            </span>
            <span className={cn(
              "absolute left-1/2 -translate-x-1/2",
              sliderValue === 3 && "text-amber-500"
            )}>
              {config.middleLabel}
            </span>
            <span className={cn(
              "absolute right-0",
              sliderValue === 5 && "text-amber-500"
            )}>
              {config.rightLabel}
            </span>
            <span className="invisible">{config.middleLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Heel drop preference card
const HeelDropPreferenceCard = ({
  preference,
  onChange,
}: {
  preference: HeelDropPreference;
  onChange: (pref: HeelDropPreference) => void;
}) => {
  const showCheckboxes = preference.mode === "user_set";
  const selectedValues = preference.values ?? [];

  const handleModeChange = (mode: PreferenceMode) => {
    if (mode === "user_set") {
      onChange({ mode, values: preference.values ?? [] });
    } else {
      onChange({ mode });
    }
  };

  const handleCheckboxChange = (option: HeelDropOption) => {
    const newValues = selectedValues.includes(option)
      ? selectedValues.filter((v) => v !== option)
      : [...selectedValues, option];
    onChange({ mode: "user_set", values: newValues });
  };

  return (
    <div className="p-4 rounded-lg bg-card-foreground/[0.02] border border-card-foreground/10">
      {/* Label with tooltip */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm text-card-foreground/90">heel drop</span>
        <AdaptiveTooltip content="the height difference between heel and forefoot. lower drops encourage midfoot striking. higher drops suit heel strikers." />
      </div>

      {/* Mode selector */}
      <ModeSelector mode={preference.mode} onChange={handleModeChange} />

      {/* Checkboxes (only shown when "i have a preference") */}
      {showCheckboxes && (
        <div className="mt-3">
          <p className="text-xs text-card-foreground/40 mb-2">select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {HEEL_DROP_OPTIONS.map((option) => {
              const isSelected = selectedValues.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleCheckboxChange(option)}
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
      )}
    </div>
  );
};

// Brand list
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
      // When switching modes, clear brands
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
    if (preference.mode === "all") return "showing all brands";
    if (preference.brands.length === 0) {
      return preference.mode === "include" ? "select brands to show" : "select brands to hide";
    }
    const brandList = preference.brands.join(", ");
    return preference.mode === "include" ? `only: ${brandList}` : `excluding: ${brandList}`;
  };

  return (
    <div className="p-4 rounded-lg bg-card-foreground/[0.02] border border-card-foreground/10">
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm text-card-foreground/90">brand preference</span>
      </div>

      {/* Collapsed view */}
      {!isExpanded && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-card-foreground/50">{getSummaryText()}</span>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            {preference.mode === "all" ? "filter" : "edit"}
          </button>
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Mode tabs */}
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
              only show
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
              exclude
            </button>
          </div>

          {/* Brand grid */}
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

          {/* Reset link */}
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-card-foreground/40 hover:text-card-foreground/60 transition-colors"
          >
            clear / show all brands
          </button>
        </div>
      )}
    </div>
  );
};

// Default preferences
const getDefaultPreferences = (): FeelPreferences => ({
  cushionAmount: { mode: "cinda_decides" },
  stabilityAmount: { mode: "cinda_decides" },
  energyReturn: { mode: "cinda_decides" },
  rocker: { mode: "cinda_decides" },
  heelDropPreference: { mode: "cinda_decides" },
  brandPreference: { mode: "all", brands: [] },
});

const ProfileBuilderStep4b = () => {
  const navigate = useNavigate();
  const { profileData, updateStep4 } = useProfile();

  const { step1, step2, step3 } = profileData;
  const { selectedArchetypes, currentArchetypeIndex, shoeRequests } = profileData.step4;
  const totalArchetypes = selectedArchetypes.length;
  const currentArchetype = selectedArchetypes[currentArchetypeIndex];

  // Initialize local state for preferences
  const [preferences, setPreferences] = useState<FeelPreferences>(getDefaultPreferences);

  // Reset preferences when archetype changes
  useEffect(() => {
    setPreferences(getDefaultPreferences());
  }, [currentArchetype]);

  // Auto-populate brand preferences from chat context (liked/disliked pastShoes)
  useEffect(() => {
    const { pastShoes } = step3.chatContext;
    const likedBrands: string[] = [];
    const dislikedBrands: string[] = [];
    
    for (const shoe of pastShoes) {
      if (typeof shoe === "object" && shoe.brand) {
        // Normalize brand name to match BRAND_OPTIONS
        const normalizedBrand = BRAND_OPTIONS.find(
          (b) => b.toLowerCase() === shoe.brand.toLowerCase()
        );
        
        if (normalizedBrand) {
          if (shoe.sentiment === "liked" && !likedBrands.includes(normalizedBrand)) {
            likedBrands.push(normalizedBrand);
          } else if (shoe.sentiment === "disliked" && !dislikedBrands.includes(normalizedBrand)) {
            dislikedBrands.push(normalizedBrand);
          }
        }
      }
    }
    
    // Prioritize: if user liked specific brands, use "only" mode
    // Otherwise, if user disliked brands, use "exclude" mode
    if (likedBrands.length > 0) {
      setPreferences((prev) => ({
        ...prev,
        brandPreference: {
          mode: "include",
          brands: likedBrands,
        },
      }));
    } else if (dislikedBrands.length > 0) {
      setPreferences((prev) => ({
        ...prev,
        brandPreference: {
          mode: "exclude",
          brands: dislikedBrands,
        },
      }));
    }
  }, []); // Only run once on mount

  // Redirect if no archetypes selected
  useEffect(() => {
    if (selectedArchetypes.length === 0) {
      navigate("/profile/step4a");
    }
  }, [selectedArchetypes, navigate]);

  const handleBack = () => {
    if (currentArchetypeIndex > 0) {
      updateStep4({ currentArchetypeIndex: currentArchetypeIndex - 1 });
    } else {
      const mode = profileData.step4.mode;
      if (mode === "analysis") {
        navigate("/profile/step4");
      } else {
        navigate("/profile/step4a");
      }
    }
  };

  const updateSliderPreference = (key: SliderConfig["key"], pref: SliderPreference) => {
    setPreferences((prev) => ({ ...prev, [key]: pref }));
  };

  const updateHeelDropPreference = (pref: HeelDropPreference) => {
    setPreferences((prev) => ({ ...prev, heelDropPreference: pref }));
  };

  const updateBrandPreference = (pref: BrandPreference) => {
    setPreferences((prev) => ({ ...prev, brandPreference: pref }));
  };

  // Validation
  const isValid = () => {
    // Check slider preferences
    for (const slider of SLIDERS) {
      const pref = preferences[slider.key];
      if (pref.mode === "user_set" && pref.value === undefined) {
        return false;
      }
    }
    // Check heel drop
    const heelDrop = preferences.heelDropPreference;
    if (heelDrop.mode === "user_set" && (!heelDrop.values || heelDrop.values.length === 0)) {
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!isValid()) return;

    const newRequest = { archetype: currentArchetype, feelPreferences: preferences };
    const existingIndex = shoeRequests.findIndex((r) => r.archetype === currentArchetype);

    let updatedRequests: typeof shoeRequests;
    if (existingIndex >= 0) {
      updatedRequests = [...shoeRequests];
      updatedRequests[existingIndex] = newRequest;
    } else {
      updatedRequests = [...shoeRequests, newRequest];
    }

    if (currentArchetypeIndex < totalArchetypes - 1) {
      updateStep4({
        shoeRequests: updatedRequests,
        currentArchetypeIndex: currentArchetypeIndex + 1,
      });
    } else {
      updateStep4({ shoeRequests: updatedRequests });

      try {
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
        saveProfile(profile as any);

        const currentShoes = step3.currentShoes.map((shoe) => ({
          shoe: shoe.shoe,
          runTypes: shoe.runTypes,
          sentiment: shoe.sentiment ?? "neutral",
        }));
        saveShoes(currentShoes as any);

        saveShoeRequests(updatedRequests);

        if (profileData.step4.gap) {
          saveGap(profileData.step4.gap);
        }

        navigate("/recommendations");
      } catch (error) {
        console.error("Error saving to localStorage:", error);
        navigate("/recommendations");
      }
    }
  };

  if (!currentArchetype) {
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
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 pb-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Heading */}
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-sm text-card-foreground/90">
                how do you want your <span className="text-orange-400 font-semibold">{ARCHETYPE_LABELS[currentArchetype]}</span> to feel?
              </p>
              <AdaptiveTooltip
                content={
                  <>
                    <p className="font-medium mb-2">understanding your preferences:</p>
                    <ul className="space-y-1.5 text-card-foreground/80">
                      <li><span className="text-orange-400">let cinda decide</span> – we'll choose based on your shoe type and running style</li>
                      <li><span className="text-orange-400">i have a preference</span> – you tell us exactly what you want</li>
                      <li><span className="text-orange-400">i don't mind</span> – this won't factor into your recommendations</li>
                    </ul>
                    <p className="mt-2 text-card-foreground/60">most runners leave preferences on 'let cinda decide' and only set specific preferences where they have strong feelings.</p>
                  </>
                }
              />
            </div>

            {/* Progress indicator for multiple roles */}
            {totalArchetypes > 1 && (
              <p className="text-xs text-card-foreground/40 mb-4">
                shoe {currentArchetypeIndex + 1} of {totalArchetypes}
              </p>
            )}

            {/* Preference cards */}
            <div className="flex flex-col gap-4 mt-4">
              {SLIDERS.map((config) => (
                <SliderPreferenceCard
                  key={config.key}
                  config={config}
                  preference={preferences[config.key]}
                  onChange={(pref) => updateSliderPreference(config.key, pref)}
                />
              ))}
              
              <HeelDropPreferenceCard
                preference={preferences.heelDropPreference}
                onChange={updateHeelDropPreference}
              />

              <BrandPreferenceCard
                preference={preferences.brandPreference}
                onChange={updateBrandPreference}
              />
            </div>
          </div>

          {/* Footer with next button */}
          <footer className="px-6 md:px-8 pb-4 pt-2 flex-shrink-0">
            <Button
              onClick={handleNext}
              variant="cta"
              className="w-full min-h-[44px] text-sm"
              disabled={!isValid()}
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
