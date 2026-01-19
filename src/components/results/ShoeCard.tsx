import { useState } from "react";
import { Check, Heart, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BuyNowModal } from "./BuyNowModal";
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
    return { text: "CLOSEST MATCH", color: "#A855F7" }; // Premium purple
  }
  if (effectiveType === "trade_off_option" || effectiveType === "trade_off") {
    return { text: "TRADE-OFF", color: "#F97316" };
  }
  return { text: "CLOSE MATCH", color: "#34D399" }; // Lighter lime-ish
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

// Inline badge component for archetype display in popover
const ArchetypeBadge = ({ archetype }: { archetype: string }) => (
  <span
    className="text-xs uppercase tracking-wide px-1.5 py-0.5 rounded font-medium mx-0.5 inline-block align-middle"
    style={{
      backgroundColor: "rgba(148, 163, 184, 0.15)",
      border: "1px solid rgba(148, 163, 184, 0.4)",
      color: "#94a3b8",
    }}
  >
    {archetypeLabels[archetype] || archetype}
  </span>
);

// Build the popover content based on archetypes
const buildArchetypePopoverContent = (archetypes: string[]) => {
  if (!archetypes || archetypes.length === 0) return null;
  
  const primary = archetypes[0];
  const secondary = archetypes.length > 1 ? archetypes.slice(1) : [];
  
  if (secondary.length === 0) {
    // Single archetype
    return (
      <p className="text-sm text-white/80 leading-relaxed">
        this shoe is considered a<ArchetypeBadge archetype={primary} />{archetypeNoun[primary] || "shoe"} and cinda recommends using it for your {archetypeRunTypes[primary] || "runs"}
      </p>
    );
  } else {
    // Multiple archetypes
    const primaryRunTypes = archetypeRunTypes[primary] || "runs";
    const secondaryRunTypes = secondary.map(a => archetypeRunTypes[a] || "runs").join(", and ");
    
    return (
      <p className="text-sm text-white/80 leading-relaxed">
        this shoe is considered both a<ArchetypeBadge archetype={primary} />{archetypeNoun[primary] || "shoe"} and a<ArchetypeBadge archetype={secondary[0]} />{archetypeNoun[secondary[0]] || "shoe"}. cinda recommends using it for your {primaryRunTypes}, but it can also be used for {secondaryRunTypes}.
      </p>
    );
  }
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

export function ShoeCard({ shoe, role, position = 1, isShortlisted = false, onShortlist, showRoleBadge = false }: ShoeCardProps) {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
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
        className={`relative w-full max-w-[90vw] min-w-[320px] rounded-2xl pt-3 px-5 pb-5 flex flex-col card-glow-${position}`}
        style={{
          background: "rgba(26, 26, 30, 0.95)",
          border: "2px solid rgba(255, 255, 255, 0.5)",
          height: "480px",
        }}
      >
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
        <h2 className={`text-2xl font-bold text-center mb-2 text-shimmer-${position}`}>
          {shoe.model} {shoe.version}
        </h2>

        {/* Badge(s) */}
        <div className="flex justify-center gap-2 mb-2">
          {showRoleBadge && roleBadgeLabel && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: "rgba(148, 163, 184, 0.15)",
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    color: "#94a3b8",
                    letterSpacing: "0.5px",
                    boxShadow: "0 0 8px rgba(148, 163, 184, 0.2)",
                  }}
                >
                  {roleBadgeLabel}
                  <Info className="w-3 h-3 opacity-70" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-72 p-4 z-50"
                style={{
                  backgroundColor: "rgba(26, 26, 30, 0.98)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {buildArchetypePopoverContent(shoe.archetypes || (shoe.archetype ? [shoe.archetype] : [shoe.role || "daily_trainer"]))}
              </PopoverContent>
            </Popover>
          )}
          <span
            className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-md font-medium"
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
        </div>

        {/* Divider */}
        <div className="h-px my-3" style={{ backgroundColor: dividerColor }} />

        {/* Match Reasons - Three Bullet Points */}
        <div className="space-y-1.5 mb-2">
          {shoe.matchReason.slice(0, 3).map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <Check 
                className="w-4 h-4 shrink-0 mt-0.5" 
                style={{ color: "#10B981" }} 
                aria-hidden="true" 
              />
              <span 
                className="text-sm leading-snug"
                style={{ color: textColorMuted }}
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
          <div className="grid grid-cols-3 gap-4 mb-3">
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
          </div>

          {/* Divider */}
          <div className="h-px my-3" style={{ backgroundColor: dividerColor }} />

        {/* Action Buttons */}
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className={cn(
              "flex-1 min-w-0 gap-1.5 py-2.5 px-3 h-auto text-xs font-medium lowercase transition-all",
              isShortlisted && "bg-primary/20 border-primary/30"
            )}
            style={isShortlisted ? {
              backgroundColor: "hsl(var(--primary) / 0.2)",
              borderColor: "hsl(var(--primary) / 0.4)",
            } : {
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: textColorMuted,
            }}
            onClick={onShortlist}
          >
            <Heart 
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-all",
                isShortlisted && "fill-primary text-primary"
              )} 
            />
            <span className={cn(
              "truncate",
              isShortlisted ? "text-primary" : ""
            )}>
              {isShortlisted ? "shortlisted" : "shortlist"}
            </span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-w-0 gap-1.5 py-2.5 px-3 h-auto text-xs font-medium lowercase"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: textColorMuted,
            }}
            onClick={() => setBuyModalOpen(true)}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">buy now</span>
          </Button>
          </div>
        </div>

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
