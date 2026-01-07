import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import { useProfile, ExperienceLevel } from "@/contexts/ProfileContext";
import { SelectionButton } from "@/components/SelectionButton";

// Optional badge component
const OptionalBadge = () => (
  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-orange-500/10 border border-orange-500/20 rounded text-orange-400/70 shadow-[0_0_8px_rgba(251,146,60,0.15)]">
    optional
  </span>
);

// Field explanation component
const FieldExplanation = ({ question, answer }: { question: string; answer: string }) => (
  <p className="mt-2 text-sm">
    <span className="italic text-orange-500">{question}</span>{" "}
    <span className="text-muted-foreground">{answer}</span>
  </p>
);

// Unit toggle component
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

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "beginner", label: "beginner", description: "new to running or just getting started" },
  { value: "intermediate", label: "intermediate", description: "running regularly for 6+ months" },
  { value: "advanced", label: "advanced", description: "experienced runner with consistent training" },
  { value: "racing_focused", label: "elite", description: "training seriously for competitive times" },
];

const ProfileBuilder = () => {
  const navigate = useNavigate();
  const { profileData, updateStep1, clearAll } = useProfile();

  // Initialize state from context
  const [firstName, setFirstName] = useState(profileData.step1.firstName);
  const [age, setAge] = useState(profileData.step1.age);
  
  // Height state - stored in cm internally
  const [heightCm, setHeightCm] = useState<number | null>(profileData.step1.heightCm);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft/in">("cm");
  const [heightCmInput, setHeightCmInput] = useState(profileData.step1.heightCm?.toString() || "");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  
  // Weight state - stored in kg internally
  const [weightKg, setWeightKg] = useState<number | null>(profileData.step1.weightKg);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightInput, setWeightInput] = useState(profileData.step1.weightKg?.toString() || "");
  
  // Experience level
  const [experience, setExperience] = useState<ExperienceLevel | null>(profileData.step1.experience);
  
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);

  // Check if form has any data (dirty state)
  const isDirty = useCallback(() => {
    const hasName = firstName.trim() !== "";
    const hasAge = age.trim() !== "";
    const hasHeight = heightCm !== null;
    const hasWeight = weightKg !== null;
    const hasExperience = experience !== null;
    return hasName || hasAge || hasHeight || hasWeight || hasExperience;
  }, [firstName, age, heightCm, weightKg, experience]);

  // Handle back navigation with dirty check
  const handleBack = () => {
    if (isDirty()) {
      setUnsavedModalOpen(true);
    } else {
      navigate("/");
    }
  };

  // Confirm leaving and clear state
  const handleConfirmLeave = () => {
    setUnsavedModalOpen(false);
    // Clear all profile data from context
    clearAll();
    navigate("/");
  };

  // Convert ft/in to cm
  const ftInToCm = (ft: number, inches: number): number => {
    return Math.round((ft * 12 + inches) * 2.54);
  };

  // Convert lbs to kg
  const lbsToKg = (lbs: number): number => {
    return Math.round(lbs * 0.453592 * 10) / 10;
  };

  // Handle height cm change
  const handleHeightCmChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setHeightCmInput(numericValue);
    setHeightCm(numericValue ? parseInt(numericValue, 10) : null);
  };

  // Handle height ft change
  const handleHeightFtChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setHeightFt(numericValue);
    updateHeightFromFtIn(numericValue, heightIn);
  };

  // Handle height in change
  const handleHeightInChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setHeightIn(numericValue);
    updateHeightFromFtIn(heightFt, numericValue);
  };

  // Update canonical height from ft/in
  const updateHeightFromFtIn = (ft: string, inches: string) => {
    if (ft || inches) {
      const ftNum = parseInt(ft, 10) || 0;
      const inNum = parseInt(inches, 10) || 0;
      setHeightCm(ftInToCm(ftNum, inNum));
    } else {
      setHeightCm(null);
    }
  };

  // Handle height unit change with conversion
  const handleHeightUnitChange = useCallback((newUnit: string) => {
    if (newUnit === heightUnit) return;
    
    if (newUnit === "ft/in" && heightCm) {
      // Convert cm to ft/in
      const totalInches = heightCm / 2.54;
      const ft = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      setHeightFt(ft.toString());
      setHeightIn(inches.toString());
      setHeightCmInput("");
    } else if (newUnit === "cm" && (heightFt || heightIn)) {
      // Convert ft/in to cm
      const ftNum = parseInt(heightFt, 10) || 0;
      const inNum = parseInt(heightIn, 10) || 0;
      const cm = Math.round((ftNum * 12 + inNum) * 2.54);
      setHeightCmInput(cm.toString());
      setHeightCm(cm);
      setHeightFt("");
      setHeightIn("");
    }
    
    setHeightUnit(newUnit as "cm" | "ft/in");
  }, [heightUnit, heightCm, heightFt, heightIn]);

  // Handle weight change
  const handleWeightChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setWeightInput(numericValue);
    if (numericValue) {
      const num = parseInt(numericValue, 10);
      setWeightKg(weightUnit === "kg" ? num : lbsToKg(num));
    } else {
      setWeightKg(null);
    }
  };

  // Handle weight unit change with conversion
  const handleWeightUnitChange = useCallback((newUnit: string) => {
    if (newUnit === weightUnit) return;
    
    if (weightInput) {
      const currentValue = parseFloat(weightInput);
      if (!isNaN(currentValue)) {
        if (newUnit === "lbs") {
          // Convert kg to lbs
          const lbs = (currentValue * 2.20462).toFixed(1);
          setWeightInput(lbs.replace(/\.0$/, ""));
        } else {
          // Convert lbs to kg
          const kg = (currentValue * 0.453592).toFixed(1);
          setWeightInput(kg.replace(/\.0$/, ""));
        }
      }
    }
    
    setWeightUnit(newUnit as "kg" | "lbs");
  }, [weightUnit, weightInput]);

  const handleNext = () => {
    // Save to context and navigate to step 2
    updateStep1({
      firstName,
      age,
      heightCm,
      weightKg,
      experience,
    });
    navigate("/profile/step2");
  };

  // Can proceed if name is filled and experience is selected
  const canProceed = firstName.trim() !== "" && experience !== null;

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
            <span className="text-xs text-card-foreground/50">step 1 of 4</span>
          </header>

          {/* Scrollable form area */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 space-y-7 pb-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* First Name - Required */}
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                first name
              </label>
              <Input
                type="text"
                placeholder="e.g., cinda"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
              />
            </div>

            {/* Age - Optional */}
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                age
                <OptionalBadge />
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g., 32"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                className="bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
              />
            </div>

            {/* Height - Optional */}
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                height
                <OptionalBadge />
              </label>
              <div className="flex gap-2 items-center">
                {heightUnit === "cm" ? (
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="178"
                    value={heightCmInput}
                    onChange={(e) => handleHeightCmChange(e.target.value)}
                    className="flex-1 bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
                  />
                ) : (
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="5"
                        value={heightFt}
                        onChange={(e) => handleHeightFtChange(e.target.value)}
                        className="w-full bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-card-foreground/40">
                        ft
                      </span>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="10"
                        value={heightIn}
                        onChange={(e) => handleHeightInChange(e.target.value)}
                        className="w-full bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-card-foreground/40">
                        in
                      </span>
                    </div>
                  </div>
                )}
                <UnitToggle
                  options={[
                    { label: "cm", value: "cm" },
                    { label: "ft/in", value: "ft/in" },
                  ]}
                  value={heightUnit}
                  onChange={handleHeightUnitChange}
                />
              </div>
              <FieldExplanation
                question="why height?"
                answer="height affects stride mechanics and how forces travel through the shoe."
              />
            </div>

            {/* Weight - Optional */}
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                weight
                <OptionalBadge />
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={weightUnit === "kg" ? "73" : "160"}
                  value={weightInput}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="flex-1 bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
                />
                <UnitToggle
                  options={[
                    { label: "kg", value: "kg" },
                    { label: "lbs", value: "lbs" },
                  ]}
                  value={weightUnit}
                  onChange={handleWeightUnitChange}
                />
              </div>
              <FieldExplanation
                question="why weight?"
                answer="weight affects how much a shoe compresses and how stable it feels underfoot."
              />
            </div>

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

            <UnsavedChangesModal
              open={unsavedModalOpen}
              onOpenChange={setUnsavedModalOpen}
              onStay={() => setUnsavedModalOpen(false)}
              onGoBack={handleConfirmLeave}
            />
          </div>

          {/* Card footer (fixed) */}
          {(() => {
            const hasAge = age.trim() !== "";
            const hasHeight = heightCm !== null;
            const hasWeight = weightKg !== null;
            const allOptionalsFilled = hasAge && hasHeight && hasWeight;

            return (
              <footer className="flex flex-col items-center px-6 md:px-8 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] flex-shrink-0">
                <div className="h-5 flex items-center justify-center w-3/4 mb-1">
                  <p
                    className={`text-xs italic text-orange-400/50 text-center transition-opacity duration-200 ${
                      allOptionalsFilled ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    completing optional fields will help cinda better recommend shoes for how you run.
                  </p>
                </div>
                <Button
                  onClick={handleNext}
                  variant="cta"
                  className="w-full max-w-[280px] min-h-[44px] text-sm mt-4"
                  disabled={!canProceed}
                >
                  next
                </Button>
              </footer>
            );
          })()}
      </PageTransition>
    </OnboardingLayout>
  );
};

export default ProfileBuilder;
