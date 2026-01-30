import { useState } from "react";
import { Check, Heart, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { BuyNowModal } from "./BuyNowModal";
import { ShortlistAuthModal } from "./ShortlistAuthModal";
interface ShoeCardProps {
  shoe: {
    brand: string;
    fullName: string;
    model: string;
    version: string;
    matchReason: string[];
    keyStrengths: string[];
    recommendationType: "closest_match" | "close_match" | "close_match_2" | "trade_off" | "trade_off_option";
    badge?: "closest_match" | "close_match" | "trade_off";
    weight_g?: number;
    weight_feel_1to5?: 1 | 2 | 3 | 4 | 5;
    heel_drop_mm: number;
    has_plate: boolean;
    plate_material: "Nylon" | "Plastic" | "Carbon" | null;
    tradeOffs?: string[];
    similar_to?: string;
    role?: string; // For Shopping Mode - shows which role this shoe is for
    archetype?: string; // For Discovery Mode - shows which archetype this shoe is for
    archetypes?: string[]; // Array of archetypes this shoe works for
    // Use case booleans for "also works for" popover
    use_daily?: boolean;
    use_easy_recovery?: boolean;
    use_tempo_workout?: boolean;
    use_speed_intervals?: boolean;
    use_race?: boolean;
    use_trail?: boolean;
    retail_price_category?: 'Budget' | 'Core' | 'Premium' | 'Race_Day';
    is_super_trainer?: boolean;
  };
  role: "daily" | "tempo" | "race" | "easy" | "long" | "trail";
  position?: 1 | 2 | 3;
  isShortlisted?: boolean;
  onShortlist?: () => void;
  showRoleBadge?: boolean; // Whether to show the role badge (Shopping Mode)
}

// Glow colors are now derived from badge type (see getBadgeConfig)

const getWeightLabel = (weight?: 1 | 2 | 3 | 4 | 5): string => {
  if (!weight) return "–";
  const labels: Record<number, string> = {
    1: "very light",
    2: "light",
    3: "balanced",
    4: "heavy",
    5: "very heavy",
  };
  return labels[weight];
};

const getPlateLabel = (
  hasPlate: boolean,
  material: "Nylon" | "Plastic" | "Carbon" | null
): string => {
  if (!hasPlate) return "none";
  return material ? material.toLowerCase() : "none";
};

const getBadgeConfig = (
  type: ShoeCardProps["shoe"]["recommendationType"],
  badge?: ShoeCardProps["shoe"]["badge"]
): { text: string; color: string } => {
  const effectiveType = badge || type;
  
  if (effectiveType === "closest_match") {
    return { text: "CLOSEST MATCH", color: "#3B82F6" }; // Rich/deep blue
  }
  if (effectiveType === "trade_off_option" || effectiveType === "trade_off") {
    return { text: "TRADE-OFF", color: "#F97316" }; // Orange (unchanged)
  }
  return { text: "CLOSE MATCH", color: "#93C5FD" }; // Light sky blue
};

const getRoleBadgeLabel = (roleOrArchetype: string): string => {
  const labels: Record<string, string> = {
    // Archetype values
    daily_trainer: "DAILY",
    recovery_shoe: "RECOVERY",
    workout_shoe: "WORKOUT",
    race_shoe: "RACE",
    trail_shoe: "TRAIL",
    // Legacy role values
    daily: "DAILY",
    tempo: "TEMPO",
    race_day: "RACE",
    race: "RACE",
    recovery: "RECOVERY",
    easy: "RECOVERY",
    long: "LONG",
    trail: "TRAIL",
    intervals: "INTERVALS",
  };
  return labels[roleOrArchetype.toLowerCase()] || roleOrArchetype.toUpperCase();
};

// Archetype display labels (lowercase for sentence use)
const archetypeLabels: Record<string, string> = {
  daily_trainer: "daily",
  recovery_shoe: "recovery",
  workout_shoe: "workout",
  race_shoe: "race",
  trail_shoe: "trail",
};

// Archetype noun (trainer vs shoe)
const archetypeNoun: Record<string, string> = {
  daily_trainer: "trainer",
  recovery_shoe: "shoe",
  workout_shoe: "shoe",
  race_shoe: "shoe",
  trail_shoe: "shoe",
};

// What run types each archetype is suited for
const archetypeRunTypes: Record<string, string> = {
  daily_trainer: "recovery runs and long runs at a comfortable pace",
  recovery_shoe: "recovery runs",
  workout_shoe: "workouts and long runs with workout segments",
  race_shoe: "races, workouts, and long runs with workout segments",
  trail_shoe: "trail runs",
};

// Build the popover content based on recommended archetype and all archetypes
const buildArchetypePopoverContent = (recommendedArchetype: string, allArchetypes: string[]) => {
  // Get full archetype name (e.g., "workout shoe", "daily trainer")
  const getFullArchetypeName = (arch: string) => {
    const label = archetypeLabels[arch] || arch;
    const noun = archetypeNoun[arch] || "shoe";
    return `${label} ${noun}`;
  };
  
  // Get secondary archetypes (excluding the recommended one)
  const secondaryArchetypes = allArchetypes.filter(a => a !== recommendedArchetype);
  
  if (secondaryArchetypes.length === 0) {
    // Should not be called if no secondary archetypes, but handle gracefully
    return (
      <p className="text-sm text-white/80 leading-relaxed">
        Cinda recommends this shoe as a {getFullArchetypeName(recommendedArchetype)}.
      </p>
    );
  }
  
  // Build secondary archetypes list
  const secondaryNames = secondaryArchetypes.map(a => getFullArchetypeName(a));
  const secondaryList = secondaryNames.length === 1 
    ? secondaryNames[0] 
    : secondaryNames.slice(0, -1).join(", ") + " and " + secondaryNames[secondaryNames.length - 1];
  const secondaryRunTypesText = secondaryArchetypes.map(a => archetypeRunTypes[a] || "runs").join(" and ");
  
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/80 leading-relaxed">
        Cinda recommends this shoe as a {getFullArchetypeName(recommendedArchetype)}.
      </p>
      <p className="text-sm text-white/80 leading-relaxed">
        This shoe is also considered a {secondaryList}, meaning it's good for {secondaryRunTypesText}.
      </p>
    </div>
  );
};

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

const getShoeImagePath = (model: string, version: string): string => {
  const fullName = `${model} ${version}`.trim();
  
  if (fullName === "Atmos" || model === "Atmos") {
    return "/shoes/topo-atmos.png";
  }
  if (fullName === "Pegasus 41" || (model === "Pegasus" && version === "41")) {
    return "/shoes/nike-pegasus-41.png";
  }
  
  return "/shoes/PLACEHOLDER.png";
};

export function ShoeCard({ shoe, role, position = 1, isShortlisted = false, onShortlist, showRoleBadge = false }: ShoeCardProps) {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const badgeConfig = getBadgeConfig(shoe.recommendationType, shoe.badge);
  // Use badge color for glow/shimmer to create visual coherence
  const shimmer = badgeConfig.color;
  const weightLabel = getWeightLabel(shoe.weight_feel_1to5);
  const plateLabel = getPlateLabel(shoe.has_plate, shoe.plate_material);
  const roleBadgeLabel = (shoe.role || shoe.archetype) ? getRoleBadgeLabel(shoe.role || shoe.archetype!) : "";

  // Always dark background - light text
  const textColor = "rgba(255, 255, 255, 0.9)";
  const textColorMuted = "rgba(255, 255, 255, 0.7)";
  const textColorSubtle = "rgba(255, 255, 255, 0.5)";
  const dividerColor = "rgba(255, 255, 255, 0.1)";
  return (
    <>
      <style>{`
        @keyframes border-glow-${position} {
          0%, 100% { box-shadow: 0 0 15px ${shimmer}90, 0 0 25px ${shimmer}60, 0 0 35px ${shimmer}40; }
          50% { box-shadow: 0 0 20px ${shimmer}99, 0 0 35px ${shimmer}70, 0 0 50px ${shimmer}50; }
        }
        @keyframes text-shimmer-${position} {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .card-glow-${position} {
          animation: border-glow-${position} 3s ease-in-out infinite;
        }
        .text-shimmer-${position} {
          background: linear-gradient(
            90deg,
            ${textColor} 0%,
            ${textColor} 25%,
            ${shimmer} 50%,
            ${textColor} 75%,
            ${textColor} 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: text-shimmer-${position} 4s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .card-glow-${position} { animation: none; box-shadow: 0 0 10px ${shimmer}70; }
          .text-shimmer-${position} { animation: none; background: none; -webkit-text-fill-color: currentColor; }
        }
      `}</style>
      <article
        className={`relative w-full max-w-[80vw] min-w-[300px] rounded-2xl pt-3 px-5 pb-5 flex flex-col card-glow-${position}`}
        style={{
          background: "rgba(26, 26, 30, 0.95)",
          border: "2px solid rgba(255, 255, 255, 0.5)",
          height: "600px",
        }}
      >
        {/* Top Corner Action Buttons */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "absolute top-4 left-4 h-8 px-2.5 flex items-center justify-center gap-1 rounded-xl transition-all z-10",
                  isShortlisted && "bg-primary/20 border-primary/30"
                )}
                style={isShortlisted ? {
                  backgroundColor: "hsl(var(--primary) / 0.2)",
                  border: "1px solid hsl(var(--primary) / 0.4)",
                } : {
                  backgroundColor: "rgba(26, 26, 30, 0.95)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
                onClick={() => {
                  // Don't toggle shortlist state - just show auth modal
                  // Shortlist toggle will happen after successful sign-in
                  setAuthModalOpen(true);
                }}
                aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
              >
                <Heart 
                  className={cn(
                    "w-3.5 h-3.5 transition-all",
                    isShortlisted ? "fill-primary text-primary" : "text-white/70"
                  )} 
                />
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  isShortlisted ? "text-primary" : "text-white/70"
                )}>
                  Save
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              className="bg-card border-border/40 text-card-foreground text-xs"
            >
              Sign in to save
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button
          className="absolute top-4 right-4 h-8 px-2.5 flex items-center justify-center gap-1 rounded-xl transition-all z-10"
          style={{
            backgroundColor: "rgba(38, 38, 44, 0.95)",
            border: `1px solid ${badgeConfig.color}40`,
          }}
          onClick={() => setBuyModalOpen(true)}
          aria-label="Buy now"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-white/85">Buy</span>
          <ExternalLink className="w-3.5 h-3.5 text-white/85" />
        </button>

        {/* Brand Logo */}
        <div className="flex justify-center mb-2 pt-1">
          {getBrandLogoPath(shoe.brand) ? (
            <img
              src={getBrandLogoPath(shoe.brand)}
              alt={shoe.brand}
              className="h-14 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <span 
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: textColorMuted }}
            >
              {shoe.brand}
            </span>
          )}
        </div>

        {/* Model Name */}
        <h2 
          className={`font-bold text-center mb-4 text-shimmer-${position} whitespace-nowrap overflow-hidden`}
          style={{
            fontSize: (() => {
              const nameLength = (shoe.model + ' ' + (shoe.version || '')).length;
              if (nameLength <= 12) return '1.5rem';   // text-2xl
              if (nameLength <= 18) return '1.25rem';  // text-xl  
              return '1.1rem';                          // text-lg
            })(),
          }}
        >
          {shoe.model} {shoe.version}
        </h2>

        {/* Badge(s) */}
        <div className="flex justify-center gap-2 mb-2">
          {showRoleBadge && roleBadgeLabel && (() => {
            // Determine the recommended archetype and all archetypes
            const recommendedArchetype = shoe.archetype || shoe.role || "daily_trainer";
            const allArchetypes = shoe.archetypes || [recommendedArchetype];
            const secondaryArchetypes = allArchetypes.filter(a => a !== recommendedArchetype);
            const hasMultipleArchetypes = secondaryArchetypes.length > 0;
            
            if (hasMultipleArchetypes) {
              // Show badge with (i) icon and popover
              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: "rgba(148, 163, 184, 0.15)",
                        border: "1px solid rgba(148, 163, 184, 0.4)",
                        color: "#94a3b8",
                        letterSpacing: "0.5px",
                        boxShadow: "0 0 8px rgba(148, 163, 184, 0.2)",
                      }}
                    >
                      {roleBadgeLabel}
                      <Info className="w-2.5 h-2.5 opacity-70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-72 p-4 z-50"
                    style={{
                      backgroundColor: "rgba(26, 26, 30, 0.98)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    {buildArchetypePopoverContent(recommendedArchetype, allArchetypes)}
                  </PopoverContent>
                </Popover>
              );
            } else {
              // Show badge without (i) icon, no popover
              return (
                <span
                  className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md font-medium"
                  style={{
                    backgroundColor: "rgba(148, 163, 184, 0.15)",
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    color: "#94a3b8",
                    letterSpacing: "0.5px",
                    boxShadow: "0 0 8px rgba(148, 163, 184, 0.2)",
                  }}
                >
                  {roleBadgeLabel}
                </span>
              );
            }
          })()}
          <span
            className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md font-medium"
            style={{
              backgroundColor: `${badgeConfig.color}26`,
              border: `1px solid ${badgeConfig.color}66`,
              color: badgeConfig.color,
              boxShadow: `0 0 12px ${badgeConfig.color}33`,
              letterSpacing: "0.5px",
            }}
          >
            {badgeConfig.text}
          </span>
          {shoe.is_super_trainer && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: "rgba(168, 85, 247, 0.15)",
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    color: "#A855F7",
                    letterSpacing: "0.5px",
                    boxShadow: "0 0 8px rgba(168, 85, 247, 0.2)",
                  }}
                >
                  Super
                  <Info className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-72 p-3 bg-[#1a1a1f] border-white/10 text-white shadow-xl"
                side="bottom"
                align="center"
              >
                <div className="space-y-2">
                  <p className="text-sm text-white/80 leading-relaxed">
                    Super trainers are shoes that use race-level foam and geometry to feel fast and efficient, while remaining stable and durable enough for regular training.
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Perfect for runners who like do-it-all versatile shoes, or want maximum capability without building a large rotation.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Shoe Image */}
        <div 
          className="flex justify-center items-center pt-3 pb-1 relative"
          style={{
            background: `radial-gradient(ellipse 80% 60% at center, ${badgeConfig.color}10 0%, transparent 70%)`,
          }}
        >
          <img
            src={getShoeImagePath(shoe.model, shoe.version)}
            alt={`${shoe.brand} ${shoe.model} ${shoe.version}`}
            className="h-[96px] w-auto max-w-full object-contain relative z-10"
            style={{
              filter: "drop-shadow(0 8px 12px rgba(0, 0, 0, 0.4))",
            }}
          />
        </div>

        {/* Divider after image */}
        <div className="h-px mt-1 mb-3" style={{ backgroundColor: dividerColor }} />

        {/* Match Reasons - Three Bullet Points */}
        <div className="space-y-1.5 mb-0 flex-1">
          {shoe.matchReason.slice(0, 3).map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <Check 
                className="w-4 h-4 shrink-0 mt-0.5" 
                style={{ color: shimmer }} 
                aria-hidden="true" 
              />
              <span 
                className="text-sm"
                style={{ color: textColorMuted, lineHeight: "1.6" }}
              >
                {reason}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom Section - Anchored */}
        <div className="mt-auto">
          {/* Divider */}
          <div className="h-px my-3" style={{ backgroundColor: dividerColor }} />

          {/* Specs Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center">
              <span className="block text-xs uppercase tracking-wide mb-1" style={{ color: textColorSubtle }}>Weight</span>
              <span className="block text-sm font-medium" style={{ color: textColorMuted }}>{weightLabel}</span>
            </div>
            <div className="text-center">
              <span className="block text-xs uppercase tracking-wide mb-1" style={{ color: textColorSubtle }}>Drop</span>
              <span className="block text-sm font-medium" style={{ color: textColorMuted }}>{shoe.heel_drop_mm}mm</span>
            </div>
            <div className="text-center">
              <span className="block text-xs uppercase tracking-wide mb-1" style={{ color: textColorSubtle }}>Plate</span>
              <span className="block text-sm font-medium" style={{ color: textColorMuted }}>{plateLabel}</span>
            </div>
            <div className="text-center">
              <span className="block text-xs uppercase tracking-wide mb-1" style={{ color: textColorSubtle }}>Tier</span>
              <span className="block text-sm font-medium" style={{ color: textColorMuted }}>
                {shoe.retail_price_category === 'Budget' ? '$' : 
                 shoe.retail_price_category === 'Core' ? '$$' : 
                 shoe.retail_price_category === 'Premium' ? '$$$' : '$$$$'}
              </span>
            </div>
          </div>
        </div>

        <ShortlistAuthModal 
          open={authModalOpen} 
          onOpenChange={setAuthModalOpen} 
        />

        <BuyNowModal
          open={buyModalOpen}
          onOpenChange={setBuyModalOpen}
          shoe={{
            fullName: shoe.fullName,
            brand: shoe.brand,
          }}
        />
      </article>
    </>
  );
}

export default ShoeCard;
