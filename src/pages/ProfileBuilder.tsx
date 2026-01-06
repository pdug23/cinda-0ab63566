import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

// Optional badge component
const OptionalBadge = () => (
  <span className="ml-2 px-2 py-0.5 text-xs bg-card-foreground/5 border border-card-foreground/20 rounded text-card-foreground/50">
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

// Personal bests type
interface PersonalBests {
  mile: string;
  "5k": string;
  "10k": string;
  half: string;
  marathon: string;
}

const ProfileBuilder = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  
  // Height state - stored in cm internally
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft/in">("cm");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  
  // Weight state - stored in kg internally
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightInput, setWeightInput] = useState("");
  
  // Personal bests - structured
  const [personalBests, setPersonalBests] = useState<PersonalBests>({
    mile: "",
    "5k": "",
    "10k": "",
    half: "",
    marathon: "",
  });

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

  // Handle height unit change
  const handleHeightUnitChange = useCallback((newUnit: string) => {
    setHeightUnit(newUnit as "cm" | "ft/in");
    // Clear inputs when switching units
    setHeightCmInput("");
    setHeightFt("");
    setHeightIn("");
    setHeightCm(null);
  }, []);

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

  // Handle weight unit change
  const handleWeightUnitChange = useCallback((newUnit: string) => {
    setWeightUnit(newUnit as "kg" | "lbs");
    setWeightInput("");
    setWeightKg(null);
  }, []);

  // Handle PB time input - only allow digits and colons
  const handlePbChange = (key: keyof PersonalBests, value: string) => {
    const sanitized = value.replace(/[^\d:]/g, "");
    setPersonalBests(prev => ({ ...prev, [key]: sanitized }));
  };

  const handleNext = () => {
    console.log({ 
      firstName, 
      age, 
      heightCm, 
      weightKg, 
      personalBests 
    });
  };

  const handleSkip = () => {
    console.log("Skipping to next step");
  };

  const pbDistances: { key: keyof PersonalBests; label: string; placeholder: string }[] = [
    { key: "mile", label: "1mi", placeholder: "mm:ss" },
    { key: "5k", label: "5k", placeholder: "mm:ss" },
    { key: "10k", label: "10k", placeholder: "mm:ss" },
    { key: "half", label: "13.1mi", placeholder: "h:mm:ss" },
    { key: "marathon", label: "26.2mi", placeholder: "h:mm:ss" },
  ];

  return (
    <div 
      className="min-h-[100dvh] overflow-y-auto" 
      style={{ 
        paddingTop: 'env(safe-area-inset-top)', 
        paddingBottom: 'env(safe-area-inset-bottom)' 
      }}
    >
      {/* Header */}
      <header className="w-full px-4 py-3 flex items-center justify-between relative z-10">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          back
        </button>
        <span className="text-xs text-card-foreground/50">step 1 of 4</span>
      </header>

      {/* Main content area */}
      <main className="flex items-center justify-center px-4 py-8 md:px-6">
        <div className="w-full max-w-lg flex flex-col bg-card rounded-2xl shadow-xl border border-border/20 overflow-hidden relative z-10">
          
          {/* Content */}
          <div className="flex flex-col p-6 md:p-8 space-y-6">
            
            {/* First Name - Required */}
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                what's your first name?
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
                how old are you?
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
                how tall are you?
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-card-foreground/40">ft</span>
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-card-foreground/40">in</span>
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
                answer="taller runners often prefer more cushioning and stability. it helps us personalize recommendations."
              />
            </div>

            {/* Weight - Optional */}
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                how much do you weigh?
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
                answer="heavier runners typically benefit from more supportive, durable shoes. helps us dial in the right cushioning."
              />
            </div>

            {/* Personal Bests - Optional */}
            <div>
              <label className="block text-sm text-card-foreground/90 mb-2">
                what are your personal bests?
                <OptionalBadge />
              </label>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="grid grid-cols-5 gap-2 min-w-[320px]">
                  {pbDistances.map(({ key, label }) => (
                    <div key={key} className="text-center">
                      <span className="text-xs text-card-foreground/60 block mb-1.5">{label}</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="—"
                        value={personalBests[key]}
                        onChange={(e) => handlePbChange(key, e.target.value)}
                        className="bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40 text-center text-sm px-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-card-foreground/40">format: mm:ss (or h:mm:ss for half/marathon)</p>
              <FieldExplanation
                question="why personal bests?"
                answer="your pbs give us insight into your training intensity and help recommend shoes that match your performance level."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleNext}
                variant="cta"
                className="flex-1 min-h-[44px] text-sm"
                disabled={!firstName.trim()}
              >
                next
              </Button>
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="flex-1 min-h-[44px] text-sm text-card-foreground/60 hover:text-card-foreground hover:bg-card-foreground/10"
              >
                skip to next step
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileBuilder;
