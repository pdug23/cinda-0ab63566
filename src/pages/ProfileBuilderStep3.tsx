import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, X, Heart, ThumbsUp, Meh, ThumbsDown, Check, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, CurrentShoe, ShoeRole, ShoeSentiment } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";
import shoebaseData from "@/data/shoebase.json";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Run type options - "daily training" replaces "all runs"
const RUN_TYPE_OPTIONS: { value: ShoeRole; label: string }[] = [
  { value: "all_runs", label: "daily training" },
  { value: "races", label: "races" },
  { value: "tempo", label: "tempo" },
  { value: "interval", label: "interval" },
  { value: "easy_recovery", label: "easy pace" },
  { value: "trail", label: "trail" },
];

// Roles that get normalized to daily training
const NORMALIZABLE_ROLES: ShoeRole[] = ["tempo", "interval", "easy_recovery"];

// Map backend role values back to frontend ShoeRole enum values
const mapRoleFromBackend = (role: string): ShoeRole => {
  const mapping: Record<string, ShoeRole> = {
    "daily": "all_runs",
    "tempo": "tempo",
    "intervals": "interval",
    "easy": "easy_recovery",
    "race": "races",
    "trail": "trail",
  };
  return (mapping[role] || role) as ShoeRole;
};

// Convert shoes from backend format to frontend format for display
const mapShoesFromBackend = (shoes: CurrentShoe[]): CurrentShoe[] => {
  return shoes.map(shoe => ({
    ...shoe,
    roles: shoe.roles.map(r => mapRoleFromBackend(r as string)),
  }));
};

// Sentiment options
const SENTIMENT_OPTIONS: { value: ShoeSentiment; label: string; icon: React.ReactNode }[] = [
  { value: "love", label: "love it", icon: <Heart className="w-4 h-4" /> },
  { value: "neutral", label: "it's okay", icon: <Meh className="w-4 h-4" /> },
  { value: "dislike", label: "not for me", icon: <ThumbsDown className="w-4 h-4" /> },
];

// Run type explanations for tooltip
const RUN_TYPE_EXPLANATIONS: Record<string, string> = {
  "daily training": "all/most of your mileage across a range of paces",
  "easy pace": "slow recovery runs, conversational pace",
  "tempo": "comfortably hard efforts, threshold runs",
  "interval": "fast repeats with recovery between",
  "races": "race day or time trials",
  "trail": "off-road, dirt, technical terrain",
};

// Love tags
const LOVE_TAGS = [
  "bouncy", "soft cushion", "lightweight", "stable", "smooth rocker",
  "long run comfort", "fast feeling", "comfortable fit", "good grip"
];

// Dislike tags
const DISLIKE_TAGS = [
  "too heavy", "too soft", "too firm", "unstable", "blisters",
  "too narrow", "too wide", "wears fast", "causes pain", "slow at speed"
];

// Role selection button component (no disabling - all buttons always enabled)
const RoleButton = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
      "border",
      selected
        ? "bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
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
      "min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
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

// Tag chip component for love/dislike tags
const TagChip = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
      "border",
      selected
        ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
        : "bg-card-foreground/5 border-card-foreground/20 text-card-foreground/70 hover:border-card-foreground/30"
    )}
  >
    {label}
  </button>
);

// Check if shoe card is complete
const isShoeComplete = (roles: ShoeRole[], sentiment: ShoeSentiment | null): boolean => {
  return roles.length > 0 && sentiment !== null;
};

// Shoe card component
const ShoeCard = ({
  shoe,
  roles,
  sentiment,
  loveTags,
  dislikeTags,
  onRoleToggle,
  onSentimentChange,
  onLoveTagToggle,
  onDislikeTagToggle,
  onRemove,
  isCollapsed,
  onToggleCollapse,
}: {
  shoe: Shoe;
  roles: ShoeRole[];
  sentiment: ShoeSentiment | null;
  loveTags: string[];
  dislikeTags: string[];
  onRoleToggle: (role: ShoeRole) => void;
  onSentimentChange: (sentiment: ShoeSentiment) => void;
  onLoveTagToggle: (tag: string) => void;
  onDislikeTagToggle: (tag: string) => void;
  onRemove: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) => {
  const complete = isShoeComplete(roles, sentiment);

  return (
    <div 
      className={cn(
        "bg-card-foreground/5 rounded-xl p-4 relative transition-all duration-200",
        "border-2",
        complete 
          ? "border-green-500/50" 
          : roles.length === 0 || sentiment === null 
            ? "border-red-500/30" 
            : "border-card-foreground/20"
      )}
    >
      {/* Header row with shoe name, collapse toggle, and remove button */}
      <div className="flex items-center gap-2 pr-8">
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded-full hover:bg-card-foreground/10 text-card-foreground/50 hover:text-card-foreground/70 transition-colors flex-shrink-0"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {/* Complete checkmark */}
        {complete && (
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
        )}

        {/* Shoe name */}
        <h3 className="text-base font-medium text-card-foreground/90 normal-case truncate flex-1">
          {shoe.full_name}
        </h3>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-card-foreground/10 hover:bg-card-foreground/20 text-card-foreground/50 hover:text-card-foreground/70 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="mt-4">
          {/* Run type selection */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-xs text-card-foreground/60">
                what do you use this shoe for?
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-card-foreground/40 hover:text-card-foreground/60 transition-colors">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] p-3 bg-card border-border/40">
                    <ul className="space-y-1.5 text-xs">
                      {Object.entries(RUN_TYPE_EXPLANATIONS).map(([type, explanation]) => (
                        <li key={type}>
                          <span className="font-medium text-orange-400">{type}:</span>{" "}
                          <span className="text-card-foreground/70">{explanation}</span>
                        </li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {RUN_TYPE_OPTIONS.map((option) => (
                <RoleButton
                  key={option.value}
                  label={option.label}
                  selected={roles.includes(option.value)}
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
            <div className="grid grid-cols-3 gap-2">
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

          {/* Love tags - show only when sentiment is "love" */}
          {sentiment === "love" && (
            <div className="mt-4">
              <label className="block text-xs text-card-foreground/60 mb-2">
                what do you love about it? <span className="text-card-foreground/40">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {LOVE_TAGS.map((tag) => (
                  <TagChip
                    key={tag}
                    label={tag}
                    selected={loveTags.includes(tag)}
                    onClick={() => onLoveTagToggle(tag)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dislike tags - show only when sentiment is "dislike" */}
          {sentiment === "dislike" && (
            <div className="mt-4">
              <label className="block text-xs text-card-foreground/60 mb-2">
                what's the issue? <span className="text-card-foreground/40">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {DISLIKE_TAGS.map((tag) => (
                  <TagChip
                    key={tag}
                    label={tag}
                    selected={dislikeTags.includes(tag)}
                    onClick={() => onDislikeTagToggle(tag)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ProfileBuilderStep3 = () => {
  const navigate = useNavigate();
  const { profileData, updateStep3, clearAll } = useProfile();

  // Local state
  const [currentShoes, setCurrentShoes] = useState<CurrentShoe[]>(mapShoesFromBackend(profileData.step3.currentShoes));
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
  const [confirmShoesModalOpen, setConfirmShoesModalOpen] = useState(false);
  const [confirmSkipModalOpen, setConfirmSkipModalOpen] = useState(false);
  const [customShoeModalOpen, setCustomShoeModalOpen] = useState(false);
  const [customShoeName, setCustomShoeName] = useState("");
  const [collapsedShoes, setCollapsedShoes] = useState<Set<string>>(new Set());

  // Sync local state with context when navigating back to this page
  useEffect(() => {
    setCurrentShoes(mapShoesFromBackend(profileData.step3.currentShoes));
  }, [profileData.step3.currentShoes]);

  // Toggle collapse state for a shoe
  const toggleCollapse = (shoeId: string) => {
    setCollapsedShoes(prev => {
      const next = new Set(prev);
      if (next.has(shoeId)) {
        next.delete(shoeId);
      } else {
        next.add(shoeId);
      }
      return next;
    });
  };

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
      { shoe, roles: [], sentiment: null, loveTags: [], dislikeTags: [] },
      ...prev,
    ]);
    setSearchQuery("");
    setShowDropdown(false);
  };

  // Add custom shoe
  const handleAddCustomShoe = () => {
    if (!customShoeName.trim()) return;
    const userInput = customShoeName.trim();
    const customShoe: Shoe = {
      full_name: userInput,
      brand: "custom",
      model: userInput,
      shoe_id: `custom_${Date.now()}`,
      version: "",
    };
    setCurrentShoes((prev) => [
      { shoe: customShoe, roles: [], sentiment: null, loveTags: [], dislikeTags: [] },
      ...prev,
    ]);
    setCustomShoeName("");
    setCustomShoeModalOpen(false);

    // Fire-and-forget tracking call
    fetch('/api/track-custom-shoe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shoeName: userInput,
        userContext: {
          experience: profileData?.step1?.experience,
          primaryGoal: profileData?.step2?.primaryGoal
        }
      })
    }).catch(err => console.error('Failed to track custom shoe:', err));
  };

  // Remove shoe
  const handleRemoveShoe = (shoeId: string) => {
    setCurrentShoes((prev) => prev.filter((s) => s.shoe.shoe_id !== shoeId));
  };

  // Toggle role for a shoe (no restrictions - all combinations allowed)
  const handleRoleToggle = (shoeId: string, role: ShoeRole) => {
    setCurrentShoes((prev) =>
      prev.map((s) => {
        if (s.shoe.shoe_id !== shoeId) return s;

        // Simple toggle - add if not present, remove if present
        if (s.roles.includes(role)) {
          return { ...s, roles: s.roles.filter((r) => r !== role) };
        } else {
          return { ...s, roles: [...s.roles, role] };
        }
      })
    );
  };

  // Set sentiment for a shoe (clear tags when sentiment changes)
  const handleSentimentChange = (shoeId: string, sentiment: ShoeSentiment) => {
    setCurrentShoes((prev) =>
      prev.map((s) =>
        s.shoe.shoe_id === shoeId ? { ...s, sentiment, loveTags: [], dislikeTags: [] } : s
      )
    );
  };

  // Toggle love tag for a shoe
  const handleLoveTagToggle = (shoeId: string, tag: string) => {
    setCurrentShoes((prev) =>
      prev.map((s) => {
        if (s.shoe.shoe_id !== shoeId) return s;
        const tags = s.loveTags || [];
        if (tags.includes(tag)) {
          return { ...s, loveTags: tags.filter((t) => t !== tag) };
        } else {
          return { ...s, loveTags: [...tags, tag] };
        }
      })
    );
  };

  // Toggle dislike tag for a shoe
  const handleDislikeTagToggle = (shoeId: string, tag: string) => {
    setCurrentShoes((prev) =>
      prev.map((s) => {
        if (s.shoe.shoe_id !== shoeId) return s;
        const tags = s.dislikeTags || [];
        if (tags.includes(tag)) {
          return { ...s, dislikeTags: tags.filter((t) => t !== tag) };
        } else {
          return { ...s, dislikeTags: [...tags, tag] };
        }
      })
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

  const handleSkipClick = () => {
    setConfirmSkipModalOpen(true);
  };

  const handleConfirmSkip = () => {
    setConfirmSkipModalOpen(false);
    updateStep3({ currentShoes: [] });
    navigate("/profile/step4");
  };

  const handleNextClick = () => {
    setConfirmShoesModalOpen(true);
  };

  // Map frontend role values to backend ShoeRole enum values
  const mapRoleToBackend = (role: ShoeRole): string => {
    const mapping: Record<ShoeRole, string> = {
      "all_runs": "daily",
      "tempo": "tempo",
      "interval": "intervals",
      "easy_recovery": "easy",
      "races": "race",
      "trail": "trail",
    };
    return mapping[role] || role;
  };

  // Backend normalization: normalize roles when saving
  // If roles include daily_training + tempo + interval + easy_pace → save as just daily_training
  // If roles = tempo + interval + easy_pace (no daily_training) → save as daily_training
  const mapRolesForSave = (shoes: CurrentShoe[]): CurrentShoe[] => {
    return shoes.map(shoe => {
      const hasAllThreeNormalizable = 
        shoe.roles.includes("tempo") && 
        shoe.roles.includes("interval") && 
        shoe.roles.includes("easy_recovery");
      
      let roles = shoe.roles;
      if (hasAllThreeNormalizable) {
        // Remove tempo, interval, easy_recovery and ensure daily_training is present
        // Keep races/trail if present
        const otherRoles = shoe.roles.filter(r => r === "races" || r === "trail");
        roles = ["all_runs" as ShoeRole, ...otherRoles];
      }
      
      // Map all roles to backend values
      const mappedRoles = roles.map(r => mapRoleToBackend(r)) as ShoeRole[];
      return { ...shoe, roles: mappedRoles };
    });
  };

  const handleConfirmNext = () => {
    setConfirmShoesModalOpen(false);
    const mappedShoes = mapRolesForSave(currentShoes);
    updateStep3({ currentShoes: mappedShoes });
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
            <button
              type="button"
              onClick={handleSkipClick}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              skip
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>

          {/* Scrollable content */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 space-y-6 pb-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Intro sentence */}
            <p className="italic text-orange-500 mb-3 text-sm">
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
              {showDropdown && searchQuery.trim() && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-card-foreground/20 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map((shoe) => (
                    <button
                      key={shoe.shoe_id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleAddShoe(shoe)}
                      className="w-full px-4 py-3 text-left text-sm text-card-foreground/80 hover:bg-orange-500/10 hover:text-orange-400 transition-colors border-b border-card-foreground/10 normal-case"
                    >
                      {shoe.full_name}
                    </button>
                  ))}
                  {/* Divider when results exist */}
                  {searchResults.length > 0 && (
                    <div className="border-t border-card-foreground/20" />
                  )}
                  {/* Add manually option */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setCustomShoeModalOpen(true)}
                    className="w-full px-4 py-3 text-left text-sm text-orange-500 hover:bg-orange-500/10 hover:text-orange-400 transition-colors"
                  >
                    can't find your shoe? add it manually
                  </button>
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
                    loveTags={item.loveTags || []}
                    dislikeTags={item.dislikeTags || []}
                    onRoleToggle={(role) => handleRoleToggle(item.shoe.shoe_id, role)}
                    onSentimentChange={(sentiment) => handleSentimentChange(item.shoe.shoe_id, sentiment)}
                    onLoveTagToggle={(tag) => handleLoveTagToggle(item.shoe.shoe_id, tag)}
                    onDislikeTagToggle={(tag) => handleDislikeTagToggle(item.shoe.shoe_id, tag)}
                    onRemove={() => handleRemoveShoe(item.shoe.shoe_id)}
                    isCollapsed={collapsedShoes.has(item.shoe.shoe_id)}
                    onToggleCollapse={() => toggleCollapse(item.shoe.shoe_id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Card footer */}
          <footer className="flex flex-col items-center px-6 md:px-8 pt-4 pb-4 flex-shrink-0 gap-3">
            <Button
              onClick={handleNextClick}
              variant="cta"
              className="w-full min-h-[44px] text-sm"
              disabled={!allShoesComplete || currentShoes.length === 0}
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

          {/* Confirm Shoes Modal */}
          <Dialog open={confirmShoesModalOpen} onOpenChange={setConfirmShoesModalOpen}>
            <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-primary">
                  confirm your rotation
                </DialogTitle>
                <DialogDescription className="text-muted-foreground pt-3 text-sm">
                  <ul className="space-y-1.5">
                    {currentShoes.map((item) => (
                      <li key={item.shoe.shoe_id} className="normal-case">
                        {item.shoe.full_name}
                      </li>
                    ))}
                  </ul>
                </DialogDescription>
              </DialogHeader>
              <div className="pt-4 flex flex-col gap-2">
                <Button
                  onClick={handleConfirmNext}
                  variant="cta"
                  className="w-full text-sm"
                >
                  looks good
                </Button>
                <Button
                  onClick={() => setConfirmShoesModalOpen(false)}
                  variant="outline"
                  className="w-full bg-transparent border-border/40 text-muted-foreground hover:bg-muted/20 hover:text-foreground text-sm"
                >
                  go back
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirm Skip Modal */}
          <Dialog open={confirmSkipModalOpen} onOpenChange={setConfirmSkipModalOpen}>
            <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-primary">
                  are you sure?
                </DialogTitle>
                <DialogDescription className="text-muted-foreground pt-3 text-sm">
                  skipping means cinda won't be able to analyse your rotation
                </DialogDescription>
              </DialogHeader>
              <div className="pt-4 flex flex-col gap-2">
                <Button
                  onClick={handleConfirmSkip}
                  variant="outline"
                  className="w-full bg-transparent border-border/40 text-muted-foreground hover:bg-muted/20 hover:text-foreground text-sm"
                >
                  skip anyway
                </Button>
                <Button
                  onClick={() => setConfirmSkipModalOpen(false)}
                  variant="cta"
                  className="w-full text-sm"
                >
                  go back
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Custom Shoe Modal */}
          <Dialog open={customShoeModalOpen} onOpenChange={setCustomShoeModalOpen}>
            <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-primary">
                  enter shoe name
                </DialogTitle>
              </DialogHeader>
              <div className="pt-3">
                <Input
                  type="text"
                  value={customShoeName}
                  onChange={(e) => setCustomShoeName(e.target.value)}
                  placeholder="e.g., nike pegasus 40"
                  className="w-full bg-card-foreground/5 border-card-foreground/20 text-card-foreground placeholder:text-card-foreground/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddCustomShoe();
                    }
                  }}
                />
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <Button
                  onClick={handleAddCustomShoe}
                  variant="cta"
                  className="w-full text-sm"
                  disabled={!customShoeName.trim()}
                >
                  add shoe
                </Button>
                <Button
                  onClick={() => {
                    setCustomShoeName("");
                    setCustomShoeModalOpen(false);
                  }}
                  variant="outline"
                  className="w-full bg-transparent border-border/40 text-muted-foreground hover:bg-muted/20 hover:text-foreground text-sm"
                >
                  cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageTransition>
      </OnboardingLayout>
    </>
  );
};

export default ProfileBuilderStep3;
