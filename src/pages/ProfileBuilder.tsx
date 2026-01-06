import { useState } from "react";
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

const ProfileBuilder = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [personalBests, setPersonalBests] = useState("");

  const handleNext = () => {
    // TODO: Save data and navigate to next step
    console.log({ firstName, age, height, weight, personalBests });
  };

  const handleSkip = () => {
    // TODO: Navigate to next step without saving optional fields
    console.log("Skipping to next step");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <header className="w-full px-4 py-3 flex items-center justify-between relative z-10 flex-shrink-0">
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
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:px-6 overflow-y-auto" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
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
              <Input
                type="text"
                placeholder="e.g., 5'10&quot; or 178cm"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
              />
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
              <Input
                type="text"
                placeholder="e.g., 160lbs or 73kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
              />
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
              <Input
                type="text"
                placeholder="e.g., 5k: 22:30, 10k: 48:00"
                value={personalBests}
                onChange={(e) => setPersonalBests(e.target.value)}
                className="bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
              />
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
