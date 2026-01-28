import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, X, Heart, Meh, ThumbsDown, Check, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { UnsavedChangesModal } from "@/components/UnsavedChangesModal";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile, CurrentShoe, RunType, ShoeSentiment } from "@/contexts/ProfileContext";
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
import { useIsMobile } from "@/hooks/use-mobile";

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
const RUN_TYPE_OPTIONS: { value: RunType; label: string }[] = [
  { value: "all_my_runs", label: "All my runs" },
  { value: "recovery", label: "Recovery" },
  { value: "long_runs", label: "Long runs" },
  { value: "workouts", label: "Workouts" },
  { value: "races", label: "Races" },
  { value: "trail", label: "Trail" },
];

// Brand logo path helper
const getBrandLogoPath = (brand: string): string => {
  const brandMap: Record<string, string> = {
    "Adidas": "/logos/adidas-logo.png",
    "Altra": "/logos/altra-logo.png",
    "ASICS": "/logos/asics-logo.png",
    "Brooks": "/logos/brooks-logo.png",
    "HOKA": "/logos/hoka-logo.png",
    "Mizuno": "/logos/mizuno-logo.png",
    "New Balance": "/logos/newbalance-logo.png",
    "Nike": "/logos/nike-logo.png",
    "On": "/logos/on-logo.png",
    "PUMA": "/logos/puma-logo.png",
    "Salomon": "/logos/salomon-logo.png",
    "Saucony": "/logos/saucony-logo.png",
    "Skechers": "/logos/skechers-logo.png",
    "Topo Athletic": "/logos/topo-logo.png",
  };
  return brandMap[brand] || "";
};

// Format run types for display
const formatRunTypesForDisplay = (runTypes: RunType[]): string => {
  if (runTypes.includes("all_my_runs")) {
    const hasTrail = runTypes.includes("trail");
    return hasTrail ? "All runs + Trail" : "All runs";
  }
  
  const labels: Record<RunType, string> = {
    all_my_runs: "All runs",
    recovery: "Recovery",
    long_runs: "Long runs",
    workouts: "Workouts",
    races: "Races",
    trail: "Trail",
  };
  
  return runTypes.map(rt => labels[rt]).join(" • ");
};

// Get sentiment icon for display
const getSentimentIcon = (sentiment: ShoeSentiment | null) => {
  switch (sentiment) {
    case "love": return <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />;
    case "neutral": return <Meh className="w-3.5 h-3.5 text-amber-400" />;
    case "dislike": return <ThumbsDown className="w-3.5 h-3.5 text-slate-400" />;
    default: return null;
  }
};

// Run types that get auto-selected when "all my runs" is selected (trail excluded)
const ALL_MY_RUNS_TYPES: RunType[] = ["recovery", "long_runs", "workouts", "races"];

// Map backend values back to frontend RunType values
const mapRunTypeFromBackend = (runType: string): RunType => {
  const mapping: Record<string, RunType> = {
    "all_my_runs": "all_my_runs",
    "recovery": "recovery",
    "long_runs": "long_runs",
    "workouts": "workouts",
    "races": "races",
    "trail": "trail",
  };
  return (mapping[runType] || runType) as RunType;
};

// Convert shoes from backend format to frontend format for display
const mapShoesFromBackend = (shoes: CurrentShoe[]): CurrentShoe[] => {
  return shoes.map(shoe => ({
    ...shoe,
    runTypes: shoe.runTypes.map(r => mapRunTypeFromBackend(r as string)),
  }));
};

// Sentiment options
const SENTIMENT_OPTIONS: { value: ShoeSentiment; label: string; icon: React.ReactNode }[] = [
  { value: "love", label: "Love it", icon: <Heart className="w-4 h-4" /> },
  { value: "neutral", label: "Neutral", icon: <Meh className="w-4 h-4" /> },
  { value: "dislike", label: "Dislike", icon: <ThumbsDown className="w-4 h-4" /> },
];

// Run type explanations for tooltip
const RUN_TYPE_EXPLANATIONS: Record<string, string> = {
  "All my runs": "I use this shoe for everything (except trail)",
  "Recovery": "Easy, slow, recovery days",
  "Long runs": "Weekly long run",
  "Workouts": "Tempo, intervals, hills, track sessions",
  "Races": "Race day",
  "Trail": "Off-road running",
};

// Love tags
const LOVE_TAGS = [
  "Bouncy", "Soft cushion", "Lightweight", "Stable", "Smooth rocker",
  "Long run comfort", "Fast feeling", "Comfortable fit", "Good grip"
];

// Dislike tags
const DISLIKE_TAGS = [
  "too heavy", "too soft", "too firm", "unstable", "blisters",
  "too narrow", "too wide", "wears fast", "causes pain", "slow at speed"
];

// Tooltip modal component for mobile
const TooltipModal = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-card border border-border/20 rounded-xl p-5 max-w-[320px] w-full shadow-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-card-foreground/10 hover:bg-card-foreground/20 text-card-foreground/50 hover:text-card-foreground/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-card-foreground mb-3 pr-8">{title}</h3>
        <div className="text-xs text-card-foreground/70 space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
};

// Adaptive tooltip component - modal on mobile, tooltip on desktop
const AdaptiveTooltip = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2 text-card-foreground/40 hover:text-card-foreground/60 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        <TooltipModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={title}
        >
          {children}
        </TooltipModal>
      </>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <button 
            type="button" 
            onClick={() => setTooltipOpen(!tooltipOpen)}
            className="text-card-foreground/40 hover:text-card-foreground/60 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] p-3 bg-card border-border/40">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

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
        ? "bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
        : "bg-card-foreground/5 border-card-foreground/10 text-card-foreground/70 hover:border-card-foreground/20 hover:bg-card-foreground/[0.07]"
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
      "min-h-[56px] px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
      "border flex flex-col items-center justify-center gap-1",
      selected
        ? "bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
        : "bg-card-foreground/5 border-card-foreground/10 text-card-foreground/70 hover:border-card-foreground/20 hover:bg-card-foreground/[0.07]"
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
        ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
        : "bg-card-foreground/5 border-card-foreground/10 text-card-foreground/70 hover:border-card-foreground/20"
    )}
  >
    {label}
  </button>
);

// Check if shoe card is complete
const isShoeComplete = (runTypes: RunType[], sentiment: ShoeSentiment | null): boolean => {
  return runTypes.length > 0 && sentiment !== null;
};

// Shoe card component
const ShoeCard = ({
  shoe,
  runTypes,
  sentiment,
  loveTags,
  dislikeTags,
  onRunTypeToggle,
  onSentimentChange,
  onLoveTagToggle,
  onDislikeTagToggle,
  onRemove,
  isCollapsed,
  onToggleCollapse,
}: {
  shoe: Shoe;
  runTypes: RunType[];
  sentiment: ShoeSentiment | null;
  loveTags: string[];
  dislikeTags: string[];
  onRunTypeToggle: (runType: RunType) => void;
  onSentimentChange: (sentiment: ShoeSentiment) => void;
  onLoveTagToggle: (tag: string) => void;
  onDislikeTagToggle: (tag: string) => void;
  onRemove: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) => {
  const complete = isShoeComplete(runTypes, sentiment);

  return (
    <div 
      className={cn(
        "bg-card-foreground/5 rounded-xl p-4 relative transition-all duration-200",
        "border-2",
        complete 
          ? "border-green-500/40" 
          : runTypes.length === 0 || sentiment === null 
            ? "border-red-500/20" 
            : "border-card-foreground/10"
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
              What do you use this shoe for?
            </label>
              <AdaptiveTooltip title="Run types">
                <ul className="space-y-1.5">
                  {Object.entries(RUN_TYPE_EXPLANATIONS).map(([type, explanation]) => (
                    <li key={type}>
                      <span className="font-medium text-orange-400">{type}:</span>{" "}
                      <span className="text-card-foreground/70">{explanation}</span>
                    </li>
                  ))}
                </ul>
              </AdaptiveTooltip>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {RUN_TYPE_OPTIONS.map((option) => (
                <RoleButton
                  key={option.value}
                  label={option.label}
                  selected={runTypes.includes(option.value)}
                  onClick={() => onRunTypeToggle(option.value)}
                />
              ))}
            </div>
          </div>

          {/* Sentiment selection */}
          <div>
            <label className="block text-xs text-card-foreground/60 mb-2">
              How do you feel about this shoe?
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
                What do you love about it? <span className="text-card-foreground/40">(optional)</span>
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
                What's the issue? <span className="text-card-foreground/40">(optional)</span>
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
      { shoe, runTypes: [], sentiment: null, loveTags: [], dislikeTags: [] },
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
      { shoe: customShoe, runTypes: [], sentiment: null, loveTags: [], dislikeTags: [] },
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

  // Toggle run type for a shoe with "all my runs" special behavior
  const handleRunTypeToggle = (shoeId: string, runType: RunType) => {
    setCurrentShoes((prev) =>
      prev.map((s) => {
        if (s.shoe.shoe_id !== shoeId) return s;

        let newRunTypes = [...s.runTypes];

        if (runType === "all_my_runs") {
          // Toggle "all my runs" - auto-select/deselect recovery, long_runs, workouts, races
          if (newRunTypes.includes("all_my_runs")) {
            // Deselect all (except trail)
            newRunTypes = newRunTypes.filter((r) => r === "trail");
          } else {
            // Select all my runs + the four types (keep trail if present)
            const hasTrail = newRunTypes.includes("trail");
            newRunTypes = ["all_my_runs", ...ALL_MY_RUNS_TYPES];
            if (hasTrail) newRunTypes.push("trail");
          }
        } else {
          // Toggle individual run type
          if (newRunTypes.includes(runType)) {
            newRunTypes = newRunTypes.filter((r) => r !== runType);
          } else {
            newRunTypes = [...newRunTypes, runType];
          }

          // Check if we need to update "all my runs" status
          if (ALL_MY_RUNS_TYPES.includes(runType)) {
            const hasAllFour = ALL_MY_RUNS_TYPES.every((t) => newRunTypes.includes(t));
            if (hasAllFour && !newRunTypes.includes("all_my_runs")) {
              newRunTypes = ["all_my_runs", ...newRunTypes];
            } else if (!hasAllFour && newRunTypes.includes("all_my_runs")) {
              newRunTypes = newRunTypes.filter((r) => r !== "all_my_runs");
            }
          }
        }

        return { ...s, runTypes: newRunTypes };
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
    return currentShoes.every((s) => s.runTypes.length > 0 && s.sentiment !== null);
  }, [currentShoes]);

  // Check if user has added at least one complete shoe (for skip/continue button text)
  const hasCompletedShoe = useMemo(() => {
    return currentShoes.length > 0 && currentShoes.some((s) => s.runTypes.length > 0 && s.sentiment !== null);
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
    navigate("/profile/step3b");
  };

  const handleNextClick = () => {
    setConfirmShoesModalOpen(true);
  };

  // Map frontend run type values to backend values
  const mapRunTypeToBackend = (runType: RunType): string => {
    const mapping: Record<RunType, string> = {
      "all_my_runs": "all_my_runs",
      "recovery": "recovery",
      "long_runs": "long_runs",
      "workouts": "workouts",
      "races": "races",
      "trail": "trail",
    };
    return mapping[runType] || runType;
  };

  // Backend normalization: if "all my runs" is selected, save as just that + trail if present
  const mapRunTypesForSave = (shoes: CurrentShoe[]): CurrentShoe[] => {
    return shoes.map(shoe => {
      let runTypes = shoe.runTypes;
      
      // If "all my runs" is selected, simplify to just that + trail if present
      if (runTypes.includes("all_my_runs")) {
        const hasTrail = runTypes.includes("trail");
        runTypes = hasTrail ? ["all_my_runs", "trail"] as RunType[] : ["all_my_runs"] as RunType[];
      }
      
      // Map all run types to backend values
      const mappedRunTypes = runTypes.map(r => mapRunTypeToBackend(r)) as RunType[];
      return { ...shoe, runTypes: mappedRunTypes };
    });
  };

  const handleConfirmNext = () => {
    setConfirmShoesModalOpen(false);
    const mappedShoes = mapRunTypesForSave(currentShoes);
    updateStep3({ currentShoes: mappedShoes });
    navigate("/profile/step3b");
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
              Back
            </button>
            <button
              type="button"
              onClick={hasCompletedShoe ? handleNextClick : handleSkipClick}
              className="h-7 px-3 flex items-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors"
            >
              {hasCompletedShoe ? 'NEXT' : 'Skip'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </header>

          {/* Scrollable content */}
          <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-styled touch-pan-y px-6 md:px-8 space-y-6 pb-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Intro sentence */}
            <p className="text-sm text-card-foreground/90 mb-3">
              Add your current shoes (or skip if you don't have any)
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
                placeholder="Search for your shoes..."
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
                    Can't find your shoe? Add it manually
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
                    runTypes={item.runTypes}
                    sentiment={item.sentiment}
                    loveTags={item.loveTags || []}
                    dislikeTags={item.dislikeTags || []}
                    onRunTypeToggle={(runType) => handleRunTypeToggle(item.shoe.shoe_id, runType)}
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
            <button
              type="button"
              onClick={handleNextClick}
              disabled={!allShoesComplete || currentShoes.length === 0}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              NEXT
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </footer>

          <UnsavedChangesModal
            open={unsavedModalOpen}
            onOpenChange={setUnsavedModalOpen}
            onStay={() => setUnsavedModalOpen(false)}
            onGoBack={handleConfirmLeave}
          />

          {/* Confirm Shoes Modal */}
          <Dialog open={confirmShoesModalOpen} onOpenChange={setConfirmShoesModalOpen}>
            <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px] p-0 gap-0">
              <DialogHeader className="p-4 pb-0 relative">
                <button
                  onClick={() => setConfirmShoesModalOpen(false)}
                  className="absolute right-4 top-4 p-1 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <DialogTitle className="text-lg font-semibold text-card-foreground">
                  Confirm your rotation
                </DialogTitle>
              </DialogHeader>
              <div className="px-4 pt-4 pb-6">
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {currentShoes.map((item) => {
                    const logoPath = getBrandLogoPath(item.shoe.brand);
                    const modelDisplay = [item.shoe.model, item.shoe.version].filter(Boolean).join(" ");
                    
                    return (
                      <div 
                        key={item.shoe.shoe_id} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-card-foreground/[0.03] border border-card-foreground/10"
                      >
                        {logoPath && (
                          <img 
                            src={logoPath} 
                            alt={item.shoe.brand}
                            className="h-4 w-auto opacity-60 mt-0.5 flex-shrink-0 brightness-0 invert"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-card-foreground font-medium truncate block">
                            {modelDisplay}
                          </span>
                          <p className="text-xs text-card-foreground/50 mt-0.5">
                            {formatRunTypesForDisplay(item.runTypes)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 pt-0 flex flex-col gap-2">
                <Button
                  onClick={handleConfirmNext}
                  variant="outline"
                  className="w-full h-9 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 hover:border-primary/60 hover:text-primary transition-colors"
                >
                  LOOKS GOOD
                </Button>
                <Button
                  onClick={() => setConfirmShoesModalOpen(false)}
                  variant="outline"
                  className="w-full h-9 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 hover:border-primary/60 hover:text-primary transition-colors"
                >
                  GO BACK
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirm Skip Modal */}
          <Dialog open={confirmSkipModalOpen} onOpenChange={setConfirmSkipModalOpen}>
            <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px] p-0 gap-0">
              <DialogHeader className="p-4 pb-0 relative">
                <button
                  onClick={() => setConfirmSkipModalOpen(false)}
                  className="absolute right-4 top-4 p-1 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <DialogTitle className="text-lg font-semibold text-card-foreground">
                  Are you sure?
                </DialogTitle>
              </DialogHeader>
              <div className="px-4 pt-4 pb-6">
                <p className="text-sm text-card-foreground/70">
                  Skipping means Cinda won't be able to analyse your rotation
                </p>
              </div>
              <div className="p-4 pt-0 flex flex-col gap-2">
                <Button
                  onClick={handleConfirmSkip}
                  variant="outline"
                  className="w-full h-9 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 hover:border-primary/60 hover:text-primary transition-colors"
                >
                  SKIP
                </Button>
                <Button
                  onClick={() => setConfirmSkipModalOpen(false)}
                  variant="outline"
                  className="w-full h-9 rounded-full text-[10px] font-medium tracking-wider uppercase text-card-foreground/60 hover:text-card-foreground bg-card-foreground/[0.03] hover:bg-card-foreground/10 border border-card-foreground/20 hover:border-primary/60 hover:text-primary transition-colors"
                >
                  GO BACK
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Custom Shoe Modal */}
          <Dialog open={customShoeModalOpen} onOpenChange={setCustomShoeModalOpen}>
            <DialogContent className="bg-card border-border/40 w-[calc(100%-48px)] max-w-[320px] p-0 gap-0">
              <DialogHeader className="p-4 pb-0 relative">
                <button
                  onClick={() => {
                    setCustomShoeName("");
                    setCustomShoeModalOpen(false);
                  }}
                  className="absolute right-4 top-4 p-1 rounded-full text-card-foreground/50 hover:text-card-foreground hover:bg-card-foreground/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <DialogTitle className="text-lg font-semibold text-card-foreground">
                  Enter shoe name
                </DialogTitle>
              </DialogHeader>
              <div className="px-4 pt-4">
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
              <div className="p-4 flex flex-col gap-2">
                <Button
                  onClick={handleAddCustomShoe}
                  variant="outline"
                  className="w-full min-h-[44px] bg-transparent border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 text-sm"
                  disabled={!customShoeName.trim()}
                >
                  Add shoe
                </Button>
                <Button
                  onClick={() => {
                    setCustomShoeName("");
                    setCustomShoeModalOpen(false);
                  }}
                  variant="outline"
                  className="w-full min-h-[44px] bg-transparent border-border/40 text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 text-sm"
                >
                  Cancel
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
