import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, DiscoveryShoeRole } from "@/contexts/ProfileContext";
import { SelectionButton } from "@/components/SelectionButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


const ROLE_OPTIONS: { value: DiscoveryShoeRole; label: string; description: string }[] = [
  { value: "daily_trainer", label: "daily trainer", description: "versatile shoe for most of your runs" },
  { value: "recovery", label: "recovery/easy shoe", description: "cushioned comfort for easy days" },
  { value: "tempo", label: "tempo/interval shoe", description: "responsive shoe for faster efforts" },
  { value: "race_day", label: "race day shoe", description: "lightweight and fast for race day" },
  { value: "trail", label: "trail shoe", description: "grip and protection for off-road" },
];

const ProfileBuilderStep4a = () => {
  const navigate = useNavigate();
  const { profileData, updateStep4 } = useProfile();
  const selectedRoles = profileData.step4.selectedRoles;

  const handleBack = () => {
    navigate("/profile/step4");
  };

  const handleRoleToggle = (role: DiscoveryShoeRole) => {
    const isSelected = selectedRoles.includes(role);
    
    if (isSelected) {
      // Remove role
      updateStep4({ selectedRoles: selectedRoles.filter((r) => r !== role) });
    } else {
      // Check max limit
      if (selectedRoles.length >= 3) {
        toast.error("you can select up to 3 types");
        return;
      }
      // Add role
      updateStep4({ selectedRoles: [...selectedRoles, role] });
    }
  };

  const handleNotSure = () => {
    // Switch to analysis mode
    updateStep4({ mode: "analysis", selectedRoles: [] });
    // TODO: Navigate to analysis flow
    console.log("Switching to Analysis Mode");
  };

  const handleNext = () => {
    if (selectedRoles.length === 0) return;
    // TODO: Navigate to Step 4b (feel preferences)
    console.log("Navigate to Step 4b with roles:", selectedRoles);
  };

  const isNextEnabled = selectedRoles.length >= 1;

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
              what type of shoes are you looking for?
            </p>
            
            {/* Helper text */}
            <p className="text-xs text-card-foreground/40 mb-4">
              select 1-3 types
            </p>

            {/* Role options */}
            <div className="flex flex-col gap-3">
              {ROLE_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={selectedRoles.includes(option.value)}
                  onClick={() => handleRoleToggle(option.value)}
                />
              ))}

              {/* Not sure option - special styling */}
              <button
                type="button"
                onClick={handleNotSure}
                className="w-full min-h-[56px] p-4 rounded-lg text-left transition-all duration-200 bg-card-foreground/5 border border-card-foreground/20 hover:border-card-foreground/30 hover:bg-card-foreground/[0.07]"
              >
                <span className="block text-sm font-medium text-card-foreground/70 italic">
                  not sure, analyse my rotation instead
                </span>
              </button>
            </div>

            {/* Selection counter */}
            {selectedRoles.length > 0 && (
              <p className="text-xs text-card-foreground/50 mt-4">
                {selectedRoles.length} of 3 selected
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
