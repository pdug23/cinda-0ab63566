import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, DiscoveryArchetype } from "@/contexts/ProfileContext";
import { SelectionButton } from "@/components/SelectionButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


const ARCHETYPE_OPTIONS: { value: DiscoveryArchetype; label: string; description: string }[] = [
  { value: "daily_trainer", label: "daily trainer", description: "a versatile shoe that handles most runs well" },
  { value: "recovery_shoe", label: "recovery shoe", description: "maximum comfort for easy and tired days" },
  { value: "workout_shoe", label: "workout shoe", description: "light and responsive for faster sessions" },
  { value: "race_shoe", label: "race shoe", description: "built for race day speed and efficiency" },
  { value: "trail_shoe", label: "trail shoe", description: "grip and protection for off-road running" },
];

const ProfileBuilderStep4a = () => {
  const navigate = useNavigate();
  const { profileData, updateStep4 } = useProfile();
  const selectedArchetypes = profileData.step4.selectedArchetypes;

  const handleBack = () => {
    navigate("/profile/step4");
  };

  const handleArchetypeToggle = (archetype: DiscoveryArchetype) => {
    const isSelected = selectedArchetypes.includes(archetype);
    
    if (isSelected) {
      // Remove archetype
      updateStep4({ selectedArchetypes: selectedArchetypes.filter((a) => a !== archetype) });
    } else {
      // Check max limit
      if (selectedArchetypes.length >= 3) {
        toast.error("you can select up to 3 types");
        return;
      }
      // Add archetype
      updateStep4({ selectedArchetypes: [...selectedArchetypes, archetype] });
    }
  };

  const handleNotSure = () => {
    // Switch to analysis mode
    updateStep4({ mode: "analysis", selectedArchetypes: [] });
    navigate("/profile/step4-analysis");
  };

  const handleNext = () => {
    if (selectedArchetypes.length === 0) return;
    // Reset archetype index and navigate to feel preferences
    updateStep4({ currentArchetypeIndex: 0, shoeRequests: [] });
    navigate("/profile/step4b");
  };

  const isNextEnabled = selectedArchetypes.length >= 1;

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
              what type of shoes are you looking for?
            </p>
            
            {/* Helper text */}
            <p className="text-xs text-card-foreground/40 mb-4">
              select 1-3 types
            </p>

            {/* Archetype options */}
            <div className="flex flex-col gap-3">
              {ARCHETYPE_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={selectedArchetypes.includes(option.value)}
                  onClick={() => handleArchetypeToggle(option.value)}
                />
              ))}

              {/* Not sure option - slate blue styling */}
              <button
                type="button"
                onClick={handleNotSure}
                className="w-full min-h-[56px] p-4 rounded-lg text-left transition-all duration-200 bg-slate-500/5 border border-slate-500/30 hover:border-slate-400/50 hover:bg-slate-500/10 hover:shadow-[0_0_20px_rgba(100,116,139,0.15)]"
              >
                <span className="block text-sm font-medium text-slate-400 italic">
                  not sure
                </span>
                <span className="block text-xs text-slate-500/70 mt-1">
                  analyse my rotation instead
                </span>
              </button>
            </div>

            {/* Selection counter */}
            {selectedArchetypes.length > 0 && (
              <p className="text-xs text-card-foreground/50 mt-4">
                {selectedArchetypes.length} of 3 selected
              </p>
            )}
          </div>

          {/* Footer with next button */}
          <footer className="px-6 md:px-8 pb-4 pt-2 flex-shrink-0">
            <Button
              onClick={handleNext}
              variant="cta"
              className="w-full min-h-[44px] text-sm"
              disabled={!isNextEnabled}
            >
              next
            </Button>
          </footer>
        </PageTransition>
      </OnboardingLayout>
    </>
  );
};

export default ProfileBuilderStep4a;
