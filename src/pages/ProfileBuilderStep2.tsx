import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SelectionButton } from "@/components/SelectionButton";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, PrimaryGoal, RunningPattern } from "@/contexts/ProfileContext";
import { PBPickerModal, PersonalBests, PBKey, formatPBTime } from "@/components/PBPickerModal";

// Optional badge component
const OptionalBadge = () => (
  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-orange-500/10 border border-orange-500/20 rounded text-orange-400/70 shadow-[0_0_8px_rgba(251,146,60,0.15)]">
    optional
  </span>
);

const GOAL_OPTIONS: { value: PrimaryGoal; label: string; description: string }[] = [
  { value: "general_fitness", label: "general fitness", description: "stay healthy and active" },
  { value: "improve_pace", label: "improve pace", description: "get faster and more efficient" },
  { value: "train_for_race", label: "train for race", description: "preparing for an event" },
  { value: "comfort_recovery", label: "comfort/recovery", description: "easy miles and injury prevention" },
  { value: "just_for_fun", label: "just for fun", description: "enjoy the run, no specific goals" },
];

const PATTERN_OPTIONS: { value: RunningPattern; label: string; description: string }[] = [
  { value: "structured_training", label: "structured training", description: "2+ runs/week, mix of easy, tempo, and long runs" },
  { value: "mostly_easy", label: "mostly easy", description: "2+ runs/week, mostly easy pace with the occasional faster effort" },
  { value: "workouts", label: "workout-focused", description: "2+ runs/week, mostly workouts and hard efforts" },
  { value: "infrequent", label: "infrequent", description: "1 run/week or less" },
];

// Personal bests distance config
const PB_DISTANCES: { key: PBKey; label: string; placeholder: string }[] = [
  { key: "5k", label: "5k", placeholder: "mm:ss" },
  { key: "10k", label: "10k", placeholder: "mm:ss" },
  { key: "half", label: "13.1mi", placeholder: "h:mm:ss" },
  { key: "marathon", label: "26.2mi", placeholder: "h:mm:ss" },
];

const ProfileBuilderStep2 = () => {
  const navigate = useNavigate();
  const { profileData, updateStep2, clearAll } = useProfile();
  
  // Check if user is a beginner (hide race times for beginners)
  const isBeginner = profileData.step1.experience === "beginner";

  // Local state initialized from context
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(profileData.step2.primaryGoal);
  const [personalBests, setPersonalBests] = useState<PersonalBests>(profileData.step2.personalBests);
  const [runningPattern, setRunningPattern] = useState<RunningPattern | null>(profileData.step2.runningPattern);
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
  const [pbModalOpen, setPbModalOpen] = useState(false);
  const [pbModalInitialDistance, setPbModalInitialDistance] = useState<PBKey>("5k");

  // Check if this step has any data
  const isDirty = useCallback(() => {
    const hasGoal = primaryGoal !== null;
    const hasPattern = runningPattern !== null;
    const hasAnyPB = Object.values(personalBests).some((pb) => pb !== null);
    return hasGoal || hasPattern || hasAnyPB;
  }, [primaryGoal, runningPattern, personalBests]);

  const handleBack = () => {
    // Save current state before navigating back (preserves data)
    updateStep2({ primaryGoal, personalBests, runningPattern });
    navigate("/profile");
  };

  // Handle navigation to landing page (discard all)
  const handleBackToStart = () => {
    if (isDirty() || profileData.step1.firstName) {
      setUnsavedModalOpen(true);
    } else {
      navigate("/");
    }
  };

  const handleConfirmLeave = () => {
    setUnsavedModalOpen(false);
    clearAll();
    navigate("/");
  };

  const handleNext = () => {
    // Save to context and proceed
    updateStep2({ primaryGoal, personalBests, runningPattern });
    console.log("Step 2 complete:", { primaryGoal, personalBests, runningPattern });
    // TODO: Navigate to step 3
  };

  const handlePatternToggle = (value: RunningPattern) => {
    // Toggle behavior for optional field
    setRunningPattern((prev) => (prev === value ? null : value));
  };

  // Open PB modal for a specific distance
  const openPbModal = (distance: PBKey) => {
    setPbModalInitialDistance(distance);
    setPbModalOpen(true);
  };

  const canProceed = primaryGoal !== null;

  return (
    <OnboardingLayout scrollable>
      <PageTransition className="flex flex-col flex-1 min-h-0">
        {/* Card header (fixed) */}
        <header className="w-full px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            back
          </button>
          <span className="text-xs text-card-foreground/50">step 2 of 4</span>
        </header>

        {/* Scrollable form area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 space-y-7 pb-6"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Primary Goal - Required */}
          <div>
            <label className="block text-sm text-card-foreground/90 mb-3">
              what's your primary running goal right now?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {GOAL_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={primaryGoal === option.value}
                  onClick={() => setPrimaryGoal(option.value)}
                />
              ))}
            </div>
          </div>

          {/* Running Pattern - Optional */}
          <div>
            <label className="block text-sm text-card-foreground/90 mb-3">
              what's your running pattern?
              <OptionalBadge />
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PATTERN_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={runningPattern === option.value}
                  onClick={() => handlePatternToggle(option.value)}
                />
              ))}
            </div>
          </div>

          {/* Estimated Race Times - Optional (hidden for beginners) */}
          {!isBeginner && (
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                estimated race times
                <OptionalBadge />
              </label>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="grid grid-cols-4 gap-3 min-w-[280px]">
                  {PB_DISTANCES.map(({ key, label, placeholder }) => (
                    <div key={key} className="text-center">
                      <span className="text-xs text-card-foreground/60 block mb-1.5">
                        {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => openPbModal(key)}
                        className="w-full h-10 px-1 text-sm rounded-md bg-card-foreground/5 border border-card-foreground/20 text-card-foreground hover:bg-card-foreground/10 transition-colors"
                      >
                        {personalBests[key] ? (
                          formatPBTime(personalBests[key])
                        ) : (
                          <span className="text-card-foreground/30">{placeholder}</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                estimated race times may or may not be your pb, but should reflect your current race pace for each distance.
              </p>
            </div>
          )}
        </div>

        {/* Card footer (fixed) */}
        <footer className="flex flex-col items-center px-6 md:px-8 pt-4 pb-4 flex-shrink-0">
          <Button
            onClick={handleNext}
            variant="cta"
            className="w-full max-w-[280px] min-h-[44px] text-sm"
            disabled={!canProceed}
          >
            next
          </Button>
        </footer>

        <PBPickerModal
          open={pbModalOpen}
          onOpenChange={setPbModalOpen}
          personalBests={personalBests}
          onSave={setPersonalBests}
          initialDistance={pbModalInitialDistance}
        />

        <UnsavedChangesModal
          open={unsavedModalOpen}
          onOpenChange={setUnsavedModalOpen}
          onStay={() => setUnsavedModalOpen(false)}
          onGoBack={handleConfirmLeave}
        />
      </PageTransition>
    </OnboardingLayout>
  );
};

export default ProfileBuilderStep2;
