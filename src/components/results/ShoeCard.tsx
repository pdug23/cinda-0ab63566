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

export function ShoeCard({ shoe, role }: ShoeCardProps) {
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
          <span className="text-sm font-medium text-card-foreground/50 uppercase tracking-wider">
            {shoe.brand}
          </span>
        </div>

        {/* Model Name */}
        <h2 className="text-2xl font-bold text-card-foreground text-center mb-3 text-shimmer">
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
        <div className="h-px bg-card-foreground/10 mb-4" />

      {/* Match Description */}
      <p className="text-sm italic text-card-foreground/70 leading-relaxed mb-4 line-clamp-3">
        {shoe.matchReason}
      </p>

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

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 bg-card/50 border-card-foreground/20 text-card-foreground/80 hover:bg-card-foreground/10 hover:text-card-foreground py-3 h-auto text-sm font-medium lowercase"
            onClick={() => {
              // TODO: Implement shortlist functionality
              console.log("Added to shortlist:", shoe.fullName);
            }}
          >
            <Heart className="w-4 h-4" />
            add to shortlist
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 bg-card/50 border-card-foreground/20 text-card-foreground/80 hover:bg-card-foreground/10 hover:text-card-foreground py-3 h-auto text-sm font-medium lowercase"
            onClick={() => {
              // TODO: Implement retailer links modal
              console.log("Where to buy:", shoe.fullName);
            }}
          >
            <ExternalLink className="w-4 h-4" />
            where to buy
          </Button>
        </div>
      </article>
    </>
  );
}

export default ShoeCard;
