import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SelectionButton } from "@/components/SelectionButton";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, ExperienceLevel, PrimaryGoal, RunningPattern } from "@/contexts/ProfileContext";

// Optional badge component
const OptionalBadge = () => (
  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-orange-500/10 border border-orange-500/20 rounded text-orange-400/70 shadow-[0_0_8px_rgba(251,146,60,0.15)]">
    optional
  </span>
);

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "beginner", label: "beginner", description: "new to running or just getting started" },
  { value: "intermediate", label: "intermediate", description: "running regularly for 6+ months" },
  { value: "advanced", label: "advanced", description: "experienced runner with consistent training" },
  { value: "racing_focused", label: "racing-focused", description: "training seriously for competitive times" },
];

const GOAL_OPTIONS: { value: PrimaryGoal; label: string; description: string }[] = [
  { value: "general_fitness", label: "general fitness", description: "stay healthy and active" },
  { value: "improve_pace", label: "improve pace", description: "get faster and more efficient" },
  { value: "train_for_race", label: "train for race", description: "preparing for an event" },
  { value: "comfort_recovery", label: "comfort/recovery", description: "easy miles and injury prevention" },
  { value: "just_for_fun", label: "just for fun", description: "enjoy the run, no specific goals" },
];

const PATTERN_OPTIONS: { value: RunningPattern; label: string; description: string }[] = [
  { value: "infrequent", label: "infrequent", description: "1-2 runs/week" },
  { value: "mostly_easy", label: "mostly easy", description: "easy pace, occasional faster" },
  { value: "structured_training", label: "structured training", description: "mix of easy, tempo, long" },
  { value: "workouts", label: "workout-focused", description: "regular speed sessions" },
  { value: "long_run_focus", label: "long-run focus", description: "building endurance" },
];

const ProfileBuilderStep2 = () => {
  const navigate = useNavigate();
  const { profileData, updateStep2, clearAll } = useProfile();

  // Local state initialized from context
  const [experience, setExperience] = useState<ExperienceLevel | null>(profileData.step2.experience);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(profileData.step2.primaryGoal);
  const [runningPattern, setRunningPattern] = useState<RunningPattern | null>(profileData.step2.runningPattern);
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);

  // Check if this step has any data
  const isDirty = useCallback(() => {
    return experience !== null || primaryGoal !== null || runningPattern !== null;
  }, [experience, primaryGoal, runningPattern]);

  const handleBack = () => {
    // Save current state before navigating back (preserves data)
    updateStep2({ experience, primaryGoal, runningPattern });
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
    updateStep2({ experience, primaryGoal, runningPattern });
    console.log("Step 2 complete:", { experience, primaryGoal, runningPattern });
    // TODO: Navigate to step 3
  };

  const handlePatternToggle = (value: RunningPattern) => {
    // Toggle behavior for optional field
    setRunningPattern((prev) => (prev === value ? null : value));
  };

  const canProceed = experience !== null && primaryGoal !== null;

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
          {/* Experience Level - Required */}
          <div>
            <label className="block text-sm text-card-foreground/90 mb-3">
              how would you describe your running experience?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EXPERIENCE_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={experience === option.value}
                  onClick={() => setExperience(option.value)}
                />
              ))}
            </div>
          </div>

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
              running pattern
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
        </div>

        {/* Card footer (fixed) */}
        <footer className="flex flex-col items-center px-6 md:px-8 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] flex-shrink-0">
          <Button
            onClick={handleNext}
            variant="cta"
            className="w-full max-w-[280px] min-h-[44px] text-sm"
            disabled={!canProceed}
          >
            next
          </Button>
        </footer>

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
