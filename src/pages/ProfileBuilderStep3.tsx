import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X, Heart, ThumbsUp, Meh, ThumbsDown } from "lucide-react";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, CurrentShoe, ShoeRole, ShoeSentiment } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";
import shoebaseData from "@/data/shoebase.json";

// Shoe type from shoebase.json
interface Shoe {
  shoe_id: string;
  brand: string;
  model: string;
  version: string;
  full_name: string;
  [key: string]: unknown;
}

const shoes = shoebaseData as Shoe[];

// Run type options
const RUN_TYPE_OPTIONS: { value: ShoeRole; label: string }[] = [
  { value: "all_runs", label: "all runs" },
  { value: "races", label: "races" },
  { value: "tempo", label: "tempo" },
  { value: "interval", label: "interval" },
  { value: "easy_recovery", label: "easy pace" },
  { value: "trail", label: "trail" },
];

// Sentiment options
const SENTIMENT_OPTIONS: { value: ShoeSentiment; label: string; icon: React.ReactNode }[] = [
  { value: "love", label: "love it", icon: <Heart className="w-4 h-4" /> },
  { value: "like", label: "it's good", icon: <ThumbsUp className="w-4 h-4" /> },
  { value: "neutral", label: "it's okay", icon: <Meh className="w-4 h-4" /> },
  { value: "dislike", label: "not for me", icon: <ThumbsDown className="w-4 h-4" /> },
];

// Role selection button component
const RoleButton = ({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
      "border",
      selected
        ? "bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
        : disabled
        ? "bg-card-foreground/5 border-card-foreground/10 text-card-foreground/30 cursor-not-allowed"
        : "bg-card-foreground/5 border-card-foreground/20 text-card-foreground/70 hover:border-card-foreground/30 hover:bg-card-foreground/[0.07]"
    )}
  >
    {label}
  </button>
);

// Sentiment button component
const SentimentButton = ({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
      "border flex items-center gap-2 justify-center",
      selected
        ? "bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
        : "bg-card-foreground/5 border-card-foreground/20 text-card-foreground/70 hover:border-card-foreground/30 hover:bg-card-foreground/[0.07]"
    )}
  >
    {icon}
    {label}
  </button>
);

// Shoe card component
const ShoeCard = ({
  shoe,
  roles,
  sentiment,
  onRoleToggle,
  onSentimentChange,
  onRemove,
}: {
  shoe: Shoe;
  roles: ShoeRole[];
  sentiment: ShoeSentiment | null;
  onRoleToggle: (role: ShoeRole) => void;
  onSentimentChange: (sentiment: ShoeSentiment) => void;
  onRemove: () => void;
}) => {
  const isAllRunsSelected = roles.includes("all_runs");

  return (
    <div className="bg-card-foreground/5 border border-card-foreground/20 rounded-xl p-4 relative">
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-card-foreground/10 hover:bg-card-foreground/20 text-card-foreground/50 hover:text-card-foreground/70 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Shoe name */}
      <h3 className="text-base font-medium text-card-foreground/90 pr-8 mb-4 normal-case">
        {shoe.full_name}
      </h3>

      {/* Run type selection */}
      <div className="mb-4">
        <label className="block text-xs text-card-foreground/60 mb-2">
          what do you use this shoe for?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {RUN_TYPE_OPTIONS.map((option) => (
            <RoleButton
              key={option.value}
              label={option.label}
              selected={roles.includes(option.value)}
              disabled={
                (option.value === "all_runs" && roles.length > 0 && !isAllRunsSelected) ||
                (option.value !== "all_runs" && isAllRunsSelected)
              }
              onClick={() => onRoleToggle(option.value)}
            />
          ))}
        </div>
      </div>

      {/* Sentiment selection */}
      <div>
        <label className="block text-xs text-card-foreground/60 mb-2">
          how do you feel about this shoe?
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SENTIMENT_OPTIONS.map((option) => (
            <SentimentButton
              key={option.value}
              label={option.label}
              icon={option.icon}
              selected={sentiment === option.value}
              onClick={() => onSentimentChange(option.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileBuilderStep3 = () => {
  const navigate = useNavigate();
  const { profileData, updateStep3, clearAll } = useProfile();

  // Local state
  const [currentShoes, setCurrentShoes] = useState<CurrentShoe[]>(profileData.step3.currentShoes);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const alreadyAddedIds = new Set(currentShoes.map((s) => s.shoe.shoe_id));
    
    return shoes
      .filter((shoe) => {
        if (alreadyAddedIds.has(shoe.shoe_id)) return false;
        return (
          shoe.brand.toLowerCase().includes(query) ||
          shoe.model.toLowerCase().includes(query) ||
          shoe.full_name.toLowerCase().includes(query)
        );
      })
      .slice(0, 5);
  }, [searchQuery, currentShoes]);

  // Check if dirty
  const isDirty = useCallback(() => {
    return currentShoes.length > 0;
  }, [currentShoes]);

  // Add shoe (newest at top)
  const handleAddShoe = (shoe: Shoe) => {
    setCurrentShoes((prev) => [
      { shoe, roles: [], sentiment: null },
      ...prev,
    ]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  // Remove shoe
  const handleRemoveShoe = (shoeId: string) => {
    setCurrentShoes((prev) => prev.filter((s) => s.shoe.shoe_id !== shoeId));
  };

  // Toggle role for a shoe
  const handleRoleToggle = (shoeId: string, role: ShoeRole) => {
    setCurrentShoes((prev) =>
      prev.map((s) => {
        if (s.shoe.shoe_id !== shoeId) return s;

        if (role === "all_runs") {
          // Toggle all_runs - if selecting, clear other roles
          if (s.roles.includes("all_runs")) {
            return { ...s, roles: [] };
          } else {
            return { ...s, roles: ["all_runs"] };
          }
        } else {
          // Toggle other role
          if (s.roles.includes(role)) {
            return { ...s, roles: s.roles.filter((r) => r !== role) };
          } else {
            // Can't add if all_runs is selected
            if (s.roles.includes("all_runs")) return s;
            return { ...s, roles: [...s.roles, role] };
          }
        }
      })
    );
  };

  // Set sentiment for a shoe
  const handleSentimentChange = (shoeId: string, sentiment: ShoeSentiment) => {
    setCurrentShoes((prev) =>
      prev.map((s) =>
        s.shoe.shoe_id === shoeId ? { ...s, sentiment } : s
      )
    );
  };

  // Validation
  const allShoesComplete = useMemo(() => {
    if (currentShoes.length === 0) return true; // No shoes is valid
    return currentShoes.every((s) => s.roles.length > 0 && s.sentiment !== null);
  }, [currentShoes]);

  // Navigation
  const handleBack = () => {
    updateStep3({ currentShoes });
    navigate("/profile/step2");
  };

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

  const handleSkip = () => {
    updateStep3({ currentShoes: [] });
    navigate("/profile/step4");
  };

  const handleNext = () => {
    updateStep3({ currentShoes });
    navigate("/profile/step4");
  };

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
            <span className="text-xs text-card-foreground/50">step 3 of 4</span>
          </header>

          {/* Scrollable content */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 space-y-6 pb-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Intro sentence */}
            <p className="italic text-orange-500 mb-3" style={{ fontSize: '16px' }}>
              add your current shoes (or skip if you don't have any)
            </p>

            {/* Search input */}
            <div className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => {
                  // Delay to allow click on dropdown
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                placeholder="search for your shoes..."
                className="w-full bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
              />

              {/* Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-card-foreground/20 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map((shoe) => (
                    <button
                      key={shoe.shoe_id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleAddShoe(shoe)}
                      className="w-full px-4 py-3 text-left text-sm text-card-foreground/80 hover:bg-orange-500/10 hover:text-orange-400 transition-colors border-b border-card-foreground/10 last:border-b-0 normal-case"
                    >
                      {shoe.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected shoes */}
            {currentShoes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentShoes.map((item) => (
                  <ShoeCard
                    key={item.shoe.shoe_id}
                    shoe={item.shoe}
                    roles={item.roles}
                    sentiment={item.sentiment}
                    onRoleToggle={(role) => handleRoleToggle(item.shoe.shoe_id, role)}
                    onSentimentChange={(sentiment) => handleSentimentChange(item.shoe.shoe_id, sentiment)}
                    onRemove={() => handleRemoveShoe(item.shoe.shoe_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Card footer */}
          <footer className="flex flex-col items-center px-6 md:px-8 pt-4 pb-4 flex-shrink-0 gap-3">
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="text-card-foreground/50 hover:text-card-foreground/70 text-sm"
            >
              skip this step
            </Button>
            <Button
              onClick={handleNext}
              variant="cta"
              className="w-full max-w-[280px] min-h-[44px] text-sm"
              disabled={!allShoesComplete}
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
    </>
  );
};

export default ProfileBuilderStep3;
