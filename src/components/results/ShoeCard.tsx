import { Check, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShoeCardProps {
  shoe: {
    brand: string;
    fullName: string;
    model: string;
    version: string;
    matchReason: string[];
    keyStrengths: string[];
    recommendationType: "close_match" | "close_match_2" | "trade_off_option";
    weight_feel_1to5: 1 | 2 | 3 | 4 | 5;
    heel_drop_mm: number;
    has_plate: boolean;
    plate_material: "Nylon" | "Plastic" | "Carbon" | null;
    tradeOffs?: string[];
    similar_to?: string;
  };
  role: "daily" | "tempo" | "race" | "easy" | "long" | "trail";
  position?: 1 | 2 | 3;
}

// Position-based color configurations (shimmer/glow only, background stays dark)
const POSITION_COLORS = {
  1: {
    shimmer: "#60a5fa",    // soft blue
  },
  2: {
    shimmer: "#3b82f6",    // slate blue
  },
  3: {
    shimmer: "#06b6d4",    // cyan-blue
  },
};

const getWeightLabel = (weight: 1 | 2 | 3 | 4 | 5): string => {
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

const getBadgeConfig = (type: ShoeCardProps["shoe"]["recommendationType"]): { text: string; color: string } => {
  if (type === "trade_off_option") {
    return { text: "TRADE-OFF", color: "#F97316" }; // orange
  }
  return { text: "CLOSE MATCH", color: "#10B981" }; // green
};

export function ShoeCard({ shoe, role, position = 1 }: ShoeCardProps) {
  const positionConfig = POSITION_COLORS[position] || POSITION_COLORS[1];
  const shimmer = positionConfig.shimmer;
  const weightLabel = getWeightLabel(shoe.weight_feel_1to5);
  const plateLabel = getPlateLabel(shoe.has_plate, shoe.plate_material);
  const badgeConfig = getBadgeConfig(shoe.recommendationType);

  // Always dark background - light text
  const textColor = "rgba(255, 255, 255, 0.9)";
  const textColorMuted = "rgba(255, 255, 255, 0.7)";
  const textColorSubtle = "rgba(255, 255, 255, 0.5)";
  const dividerColor = "rgba(255, 255, 255, 0.1)";
  return (
    <>
      <style>{`
        @keyframes border-glow-${position} {
          0%, 100% { box-shadow: 0 0 8px ${shimmer}70, 0 0 12px ${shimmer}50, 0 0 16px ${shimmer}30; }
          50% { box-shadow: 0 0 10px ${shimmer}90, 0 0 16px ${shimmer}60, 0 0 22px ${shimmer}40; }
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
        className={`relative w-full max-w-[90vw] min-w-[320px] rounded-2xl p-6 card-glow-${position}`}
        style={{
          background: "rgba(26, 26, 30, 0.95)",
          border: "2px solid rgba(255, 255, 255, 0.85)",
        }}
      >
        {/* Shoe Image */}
        <div className="flex justify-center mb-2">
          <img
            src="/shoes/shoe-placeholder.png"
            alt={`${shoe.brand} ${shoe.model} ${shoe.version}`}
            className="w-40 h-auto object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Brand Name */}
        <div className="text-center mb-1">
          <span 
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color: textColorMuted }}
          >
            {shoe.brand}
          </span>
        </div>

        {/* Model Name */}
        <h2 className={`text-2xl font-bold text-center mb-3 text-shimmer-${position}`}>
          {shoe.model} {shoe.version}
        </h2>

        {/* Badge */}
        <div className="flex justify-center mb-3">
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
        <div className="h-px mb-3" style={{ backgroundColor: dividerColor }} />

        {/* Match Reasons - Two Bullet Points */}
        <div className="space-y-2 mb-3">
          {shoe.matchReason.slice(0, 2).map((reason, idx) => (
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

        {/* Divider */}
        <div className="h-px mb-3" style={{ backgroundColor: dividerColor }} />

        {/* Specs Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
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
      <div className="h-px mb-4" style={{ backgroundColor: dividerColor }} />

        {/* Action Buttons */}
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1 min-w-0 gap-1.5 py-2.5 px-3 h-auto text-xs font-medium lowercase"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: textColorMuted,
            }}
            onClick={() => {
              // TODO: Implement shortlist functionality
              console.log("Added to shortlist:", shoe.fullName);
            }}
          >
            <Heart className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">add to shortlist</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-w-0 gap-1.5 py-2.5 px-3 h-auto text-xs font-medium lowercase"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: textColorMuted,
            }}
            onClick={() => {
              // TODO: Implement retailer links modal
              console.log("Buy now:", shoe.fullName);
            }}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">buy now</span>
          </Button>
        </div>
      </article>
    </>
  );
}

export default ShoeCard;
