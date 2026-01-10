import { Check, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShoeCardProps {
  shoe: {
    brand: string;
    fullName: string;
    model: string;
    version: string;
    matchReason: string;
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

// Position-based color configurations
const POSITION_COLORS = {
  1: {
    background: "#e2e8f0", // silver/platinum
    shimmer: "#60a5fa",    // soft blue
  },
  2: {
    background: "#64748b", // slate grey
    shimmer: "#3b82f6",    // slate blue
  },
  3: {
    background: "#2563eb", // brighter blue
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
  const weightLabel = getWeightLabel(shoe.weight_feel_1to5);
  const plateLabel = getPlateLabel(shoe.has_plate, shoe.plate_material);
  const badgeConfig = getBadgeConfig(shoe.recommendationType);

  // Determine text color based on background brightness
  const isDarkBackground = position === 2 || position === 3;
  const textColor = isDarkBackground ? "rgba(255, 255, 255, 0.9)" : "rgba(30, 30, 35, 0.9)";
  const textColorMuted = isDarkBackground ? "rgba(255, 255, 255, 0.6)" : "rgba(30, 30, 35, 0.6)";
  const textColorSubtle = isDarkBackground ? "rgba(255, 255, 255, 0.4)" : "rgba(30, 30, 35, 0.4)";
  const dividerColor = isDarkBackground ? "rgba(255, 255, 255, 0.1)" : "rgba(30, 30, 35, 0.1)";

  return (
    <>
      <style>{`
        @keyframes border-glow-${position} {
          0%, 100% { box-shadow: 0 0 8px ${positionConfig.shimmer}4D, 0 0 16px ${positionConfig.shimmer}26, 0 4px 24px rgba(0, 0, 0, 0.15); }
          50% { box-shadow: 0 0 16px ${positionConfig.shimmer}80, 0 0 32px ${positionConfig.shimmer}40, 0 4px 24px rgba(0, 0, 0, 0.15); }
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
            ${positionConfig.shimmer} 50%,
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
          .card-glow-${position} { animation: none; box-shadow: 0 0 8px ${positionConfig.shimmer}4D, 0 4px 24px rgba(0, 0, 0, 0.15); }
          .text-shimmer-${position} { animation: none; background: none; -webkit-text-fill-color: currentColor; }
        }
      `}</style>
      <article
        className={`relative w-full max-w-[90vw] min-w-[320px] rounded-2xl p-6 card-glow-${position}`}
        style={{
          background: positionConfig.background,
          border: `1px solid ${positionConfig.shimmer}4D`,
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
        <div className="flex justify-center mb-4">
          <span
            className="flex items-center gap-1.5 text-xs uppercase tracking-wide px-3 py-1.5 rounded-md font-medium"
            style={{
              backgroundColor: `${badgeConfig.color}26`,
              border: `1px solid ${badgeConfig.color}66`,
              color: badgeConfig.color,
              boxShadow: `0 0 12px ${badgeConfig.color}33`,
              letterSpacing: "0.5px",
            }}
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {badgeConfig.text}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px mb-4" style={{ backgroundColor: dividerColor }} />

      {/* Match Description */}
      <p 
        className="text-sm italic leading-relaxed mb-4 line-clamp-3"
        style={{ color: textColorMuted }}
      >
        {shoe.matchReason}
      </p>

      {/* Divider */}
      <div className="h-px mb-4" style={{ backgroundColor: dividerColor }} />

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
              backgroundColor: isDarkBackground ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.05)",
              borderColor: isDarkBackground ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
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
              backgroundColor: isDarkBackground ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.05)",
              borderColor: isDarkBackground ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
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
