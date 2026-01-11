import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SelectionButton } from "@/components/SelectionButton";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, PrimaryGoal, RunningPattern, TrailRunning, WeeklyVolume, FootStrike, RaceTime } from "@/contexts/ProfileContext";
import { RaceTimePickerModal, formatRaceTime } from "@/components/RaceTimePickerModal";
import { Input } from "@/components/ui/input";

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
  { value: "comfort_recovery", label: "recovery", description: "easy miles and injury prevention" },
  { value: "just_for_fun", label: "just for fun", description: "enjoy the run, no specific goals" },
];

const PATTERN_OPTIONS: { value: RunningPattern; label: string; description: string }[] = [
  { value: "structured_training", label: "structured training", description: "2+ runs/week, mix of easy, tempo, and long runs" },
  { value: "mostly_easy", label: "mostly easy", description: "2+ runs/week, mostly easy pace with the occasional faster effort" },
  { value: "workouts", label: "workout-focused", description: "2+ runs/week, mostly workouts and hard efforts" },
  { value: "infrequent", label: "infrequent", description: "1 run/week or less" },
];

const TRAIL_OPTIONS: { value: TrailRunning; label: string; description: string }[] = [
  { value: "most_runs", label: "i do trails for most or all of my runs", description: "trail shoes are a priority" },
  { value: "infrequent", label: "i do trails, but infrequently", description: "occasional trail capability" },
  { value: "want_to_start", label: "i want to start trail running", description: "looking to explore trails" },
  { value: "no_trails", label: "no trails for me", description: "road or treadmill only" },
];

const FOOT_STRIKE_OPTIONS: { value: FootStrike; label: string; description: string }[] = [
  { value: "forefoot", label: "forefoot", description: "land on the ball of my foot" },
  { value: "midfoot", label: "midfoot", description: "land evenly across my foot" },
  { value: "heel", label: "heel", description: "land on my heel first" },
  { value: "unsure", label: "unsure", description: "i don't know my strike pattern" },
];

// Unit toggle component (matches Step 1 styling)
const UnitToggle = ({ 
  options, 
  value, 
  onChange 
}: { 
  options: { label: string; value: string }[]; 
  value: string; 
  onChange: (value: string) => void;
}) => (
  <div className="flex rounded-md overflow-hidden border border-card-foreground/20 flex-shrink-0">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`px-3 py-1.5 text-xs transition-colors ${
          value === option.value
            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
            : "bg-card-foreground/5 text-card-foreground/50 hover:text-card-foreground/70"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const ProfileBuilderStep2 = () => {
  const navigate = useNavigate();
  const { profileData, updateStep2, clearAll } = useProfile();
  
  // Check if user is a beginner (hide optional fields for beginners)
  const isBeginner = profileData.step1.experience === "beginner";

  // Local state initialized from context
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(profileData.step2.primaryGoal);
  const [raceTime, setRaceTime] = useState<RaceTime | null>(profileData.step2.raceTime);
  const [runningPattern, setRunningPattern] = useState<RunningPattern | null>(profileData.step2.runningPattern);
  const [trailRunning, setTrailRunning] = useState<TrailRunning | null>(profileData.step2.trailRunning);
  const [footStrike, setFootStrike] = useState<FootStrike | null>(profileData.step2.footStrike);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolume | null>(profileData.step2.weeklyVolume);
  const [volumeInput, setVolumeInput] = useState<string>(
    profileData.step2.weeklyVolume?.value?.toString() || ""
  );
  const [volumeUnit, setVolumeUnit] = useState<"km" | "mi">(
    profileData.step2.weeklyVolume?.unit || "km"
  );
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
  const [raceTimeModalOpen, setRaceTimeModalOpen] = useState(false);

  // Check if this step has any data
  const isDirty = useCallback(() => {
    const hasGoal = primaryGoal !== null;
    const hasPattern = runningPattern !== null;
    const hasRaceTime = raceTime !== null;
    const hasTrail = trailRunning !== null;
    const hasFootStrike = footStrike !== null;
    const hasVolume = volumeInput.trim() !== "";
    return hasGoal || hasPattern || hasRaceTime || hasTrail || hasFootStrike || hasVolume;
  }, [primaryGoal, runningPattern, raceTime, trailRunning, footStrike, volumeInput]);

  // Validate and parse weekly volume
  const validateAndParseVolume = (): WeeklyVolume | null => {
    const trimmed = volumeInput.trim();
    if (!trimmed) return null;
    
    const value = parseInt(trimmed, 10);
    if (isNaN(value)) {
      setVolumeError("please enter a valid number");
      return undefined as unknown as WeeklyVolume | null; // Signal error
    }
    
    const maxValue = volumeUnit === "km" ? 300 : 186;
    if (value < 0 || value > maxValue) {
      setVolumeError(`please enter a value between 0 and ${maxValue} ${volumeUnit}`);
      return undefined as unknown as WeeklyVolume | null;
    }
    
    setVolumeError(null);
    return { value, unit: volumeUnit };
  };

  // Handle unit switching with conversion
  const handleUnitSwitch = (newUnit: string) => {
    const unit = newUnit as "km" | "mi";
    if (unit === volumeUnit) return;
    
    const trimmed = volumeInput.trim();
    if (trimmed) {
      const value = parseFloat(trimmed);
      if (!isNaN(value)) {
        const converted = unit === "mi" 
          ? Math.round(value * 0.621371 * 10) / 10
          : Math.round(value * 1.60934 * 10) / 10;
        setVolumeInput(Math.round(converted).toString());
      }
    }
    setVolumeUnit(unit);
    setVolumeError(null);
  };

  // Handle volume input change (integers only)
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setVolumeInput(value);
    setVolumeError(null);
  };

  const handleBack = () => {
    const parsedVolume = volumeInput.trim() ? validateAndParseVolume() : null;
    const finalVolume = parsedVolume === undefined ? null : parsedVolume;
    // Save current state before navigating back (preserves data)
    updateStep2({ 
      primaryGoal, 
      raceTime, 
      runningPattern, 
      trailRunning, 
      footStrike,
      weeklyVolume: finalVolume 
    });
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
    // Validate volume if entered
    if (volumeInput.trim()) {
      const parsedVolume = validateAndParseVolume();
      if (parsedVolume === undefined) return; // Has error
      setWeeklyVolume(parsedVolume);
      updateStep2({ 
        primaryGoal, 
        raceTime, 
        runningPattern, 
        trailRunning, 
        footStrike,
        weeklyVolume: parsedVolume 
      });
    } else {
      updateStep2({ 
        primaryGoal, 
        raceTime, 
        runningPattern, 
        trailRunning, 
        footStrike,
        weeklyVolume: null 
      });
    }
    navigate("/profile/step3");
  };

  const handleTrailToggle = (value: TrailRunning) => {
    // Toggle behavior - clicking selected button deselects it
    setTrailRunning((prev) => (prev === value ? null : value));
  };

  const handleFootStrikeToggle = (value: FootStrike) => {
    // Toggle behavior - clicking selected button deselects it
    setFootStrike((prev) => (prev === value ? null : value));
  };

  const canProceed = primaryGoal !== null && runningPattern !== null && trailRunning !== null;

  // Calculate if all optional fields are filled
  const hasVolume = volumeInput.trim() !== "";
  const hasRaceTime = raceTime !== null;
  const allOptionalsFilled = isBeginner || (hasVolume && hasRaceTime);

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout 
        scrollable
        bottomText={allOptionalsFilled ? null : "completing optional fields will help cinda better recommend shoes for how you run."}
      >
        <PageTransition className="flex flex-col flex-1 min-h-0">
        {/* Card header (fixed) */}
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

          {/* Running Pattern - Required */}
          <div>
            <label className="block text-sm text-card-foreground/90 mb-3">
              what's your running pattern?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PATTERN_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={runningPattern === option.value}
                  onClick={() => setRunningPattern(option.value)}
                />
              ))}
            </div>
          </div>

          {/* Trail Running */}
          <div>
            <label className="block text-sm text-card-foreground/90 mb-3">
              what about trail running?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TRAIL_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={trailRunning === option.value}
                  onClick={() => handleTrailToggle(option.value)}
                />
              ))}
            </div>
          </div>

          {/* Foot Strike - Optional (hidden for beginners) */}
          {!isBeginner && (
            <div>
              <label className="block text-sm text-card-foreground/90 mb-3">
                how does your foot land when you run?
                <OptionalBadge />
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FOOT_STRIKE_OPTIONS.map((option) => (
                  <SelectionButton
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    selected={footStrike === option.value}
                    onClick={() => handleFootStrikeToggle(option.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Weekly Volume - Optional (hidden for beginners) */}
          {!isBeginner && (
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                average weekly volume
                <OptionalBadge />
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={volumeInput}
                    onChange={handleVolumeChange}
                    placeholder="35"
                    className={`w-full bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40 pr-10 ${
                      volumeError ? "border-red-500" : ""
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-card-foreground/40">
                    {volumeUnit}
                  </span>
                </div>
                <UnitToggle
                  options={[
                    { label: "km", value: "km" },
                    { label: "mi", value: "mi" },
                  ]}
                  value={volumeUnit}
                  onChange={handleUnitSwitch}
                />
              </div>
              {volumeError && (
                <p className="mt-2 text-sm text-red-500">{volumeError}</p>
              )}
            </div>
          )}

          {/* Estimated Race Times - Optional (hidden for beginners) */}
          {!isBeginner && (
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                estimated race times
                <OptionalBadge />
              </label>
              <button
                type="button"
                onClick={() => setRaceTimeModalOpen(true)}
                className="w-full h-10 px-3 text-sm rounded-md bg-card-foreground/5 border border-card-foreground/20 text-card-foreground hover:bg-card-foreground/10 transition-colors flex items-center justify-between"
              >
                <span className={raceTime ? "text-card-foreground" : "text-card-foreground/40"}>
                  {raceTime ? formatRaceTime(raceTime) : "tap to enter time"}
                </span>
                <span className={raceTime ? "text-orange-400" : "text-card-foreground/40"}>
                  {raceTime ? raceTime.distance : "select distance"}
                </span>
              </button>
              <p className="mt-3 text-sm">
                <span className="italic text-orange-500">what about pbs?</span>{" "}
                <span className="text-muted-foreground">estimated race times may or may not be your pb, but should reflect your current race pace for each distance.</span>
              </p>
            </div>
          )}
        </div>

        {/* Card footer (fixed) */}
        <footer className="flex flex-col items-center px-6 md:px-8 pt-3 pb-4 flex-shrink-0">
          <Button
            onClick={handleNext}
            variant="cta"
            className="w-full min-h-[44px] text-sm"
            disabled={!canProceed}
          >
            next
          </Button>
        </footer>

        <RaceTimePickerModal
          open={raceTimeModalOpen}
          onOpenChange={setRaceTimeModalOpen}
          raceTime={raceTime}
          onSave={setRaceTime}
        />

        <UnsavedChangesModal
          open={unsavedModalOpen}
          onOpenChange={setUnsavedModalOpen}
          onStay={() => setUnsavedModalOpen(false)}
          onGoBack={handleConfirmLeave}
        />
      </PageTransition>
    </OnboardingLayout>
    </>
  );
};

export default ProfileBuilderStep2;
