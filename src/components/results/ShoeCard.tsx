import { useState, useEffect } from "react";
import { Check, ChevronDown, Heart, ExternalLink } from "lucide-react";
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
  collapseKey?: number;
}

const ROLE_COLORS: Record<string, string> = {
  daily: "#F97316",
  tempo: "#3B82F6",
  race: "#EF4444",
  easy: "#10B981",
  long: "#8B5CF6",
  trail: "#92400E",
};

const getWeightLabel = (weight: 1 | 2 | 3 | 4 | 5): string => {
  const labels: Record<number, string> = {
    1: "ultra-light",
    2: "light",
    3: "balanced",
    4: "substantial",
    5: "heavy",
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

export function ShoeCard({ shoe, role, collapseKey }: ShoeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Collapse when collapseKey changes (triggered by slide change)
  useEffect(() => {
    if (collapseKey !== undefined && collapseKey > 0) {
      setIsExpanded(false);
    }
  }, [collapseKey]);

  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.daily;
  const weightLabel = getWeightLabel(shoe.weight_feel_1to5);
  const plateLabel = getPlateLabel(shoe.has_plate, shoe.plate_material);
  const badgeConfig = getBadgeConfig(shoe.recommendationType);
  

  return (
    <>
      <style>{`
        @keyframes border-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(56, 189, 248, 0.3), 0 0 16px rgba(56, 189, 248, 0.1), 0 4px 24px rgba(0, 0, 0, 0.15); }
          50% { box-shadow: 0 0 12px rgba(56, 189, 248, 0.5), 0 0 24px rgba(56, 189, 248, 0.2), 0 4px 24px rgba(0, 0, 0, 0.15); }
        }
        @keyframes text-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .card-glow {
          animation: border-glow 3s ease-in-out infinite;
        }
        .text-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.9) 0%,
            rgba(255, 255, 255, 1) 25%,
            rgba(56, 189, 248, 0.9) 50%,
            rgba(255, 255, 255, 1) 75%,
            rgba(255, 255, 255, 0.9) 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: text-shimmer 4s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .card-glow { animation: none; box-shadow: 0 0 8px rgba(56, 189, 248, 0.3), 0 4px 24px rgba(0, 0, 0, 0.15); }
          .text-shimmer { animation: none; background: none; -webkit-text-fill-color: currentColor; }
        }
      `}</style>
      <article
        className="relative w-full max-w-[90vw] min-w-[320px] rounded-2xl p-6 card-glow"
        style={{
          background: "rgba(26, 26, 30, 0.95)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          borderLeft: `2px solid ${roleColor}`,
        }}
      >
        {/* Shoe Image */}
        <div className="flex justify-center mb-4">
          <img
            src="/shoes/shoe-placeholder.png"
            alt={`${shoe.brand} ${shoe.model} ${shoe.version}`}
            className="w-40 h-auto object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Brand Name */}
        <div className="text-center mb-2">
          <span className="text-sm font-medium text-card-foreground/50 uppercase tracking-wider">
            {shoe.brand}
          </span>
        </div>

        {/* Model Name */}
        <h2 className="text-2xl font-bold text-card-foreground text-center mb-4 text-shimmer">
          {shoe.model} {shoe.version}
        </h2>

      {/* Badge */}
      <div className="flex justify-center mb-6">
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
      <div className="h-px bg-card-foreground/10 mb-4" />

      {/* Key Strengths */}
      <ul className="space-y-2 mb-4">
        {shoe.keyStrengths.map((strength, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[15px] text-card-foreground/70"
          >
            <Check
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: "#10B981" }}
              aria-hidden="true"
            />
            {strength}
          </li>
        ))}
      </ul>

      {/* Divider */}
      <div className="h-px bg-card-foreground/10 mb-4" />

      {/* Specs Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <span className="block text-xs text-card-foreground/40 uppercase tracking-wide mb-1">Weight</span>
          <span className="block text-sm text-card-foreground/80 font-medium">{weightLabel}</span>
        </div>
        <div className="text-center">
          <span className="block text-xs text-card-foreground/40 uppercase tracking-wide mb-1">Drop</span>
          <span className="block text-sm text-card-foreground/80 font-medium">{shoe.heel_drop_mm}mm</span>
        </div>
        <div className="text-center">
          <span className="block text-xs text-card-foreground/40 uppercase tracking-wide mb-1">Plate</span>
          <span className="block text-sm text-card-foreground/80 font-medium">{plateLabel}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-card-foreground/10 mb-4" />

      {/* Expandable Section Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-card-foreground/60 hover:text-card-foreground/80 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
        aria-expanded={isExpanded}
        aria-controls="shoe-details"
      >
        Why this shoe?
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Expanded Content */}
      <div
        id="shoe-details"
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-4 border-t border-card-foreground/10 space-y-4">
          {/* Why it matches */}
          <div>
            <h4 className="text-sm font-medium text-card-foreground/80 mb-2">
              Why it matches your preferences:
            </h4>
            <p className="text-sm text-card-foreground/60">
              Based on your profile, this shoe aligns well with your training
              needs and feel preferences.
            </p>
          </div>

          {/* Trade-offs (conditional) */}
          {shoe.tradeOffs && shoe.tradeOffs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-card-foreground/80 mb-2">
                Trade-offs to consider:
              </h4>
              <ul className="space-y-1">
                {shoe.tradeOffs.map((tradeOff, i) => (
                  <li key={i} className="text-sm text-card-foreground/60">
                    • {tradeOff}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Similar alternatives (conditional) */}
          {shoe.similar_to && (
            <div>
              <h4 className="text-sm font-medium text-card-foreground/80 mb-2">
                Similar alternatives:
              </h4>
              <p className="text-sm text-card-foreground/60">{shoe.similar_to}</p>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-card-foreground/10 my-4" />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button
          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 h-auto"
          onClick={() => {
            // TODO: Implement shortlist functionality
            console.log("Added to shortlist:", shoe.fullName);
          }}
        >
          <Heart className="w-4 h-4" />
          Add to Shortlist
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 border-card-foreground/20 text-card-foreground/80 hover:bg-card-foreground/10 hover:text-card-foreground py-3 h-auto"
          onClick={() => {
            // TODO: Implement retailer links modal
            console.log("Where to buy:", shoe.fullName);
          }}
        >
          <ExternalLink className="w-4 h-4" />
          Where to Buy
        </Button>
      </div>
      </article>
    </>
  );
}

export default ShoeCard;
