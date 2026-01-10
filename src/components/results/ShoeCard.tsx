import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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
    1: "Ultra",
    2: "Light",
    3: "Balanced",
    4: "Substantial",
    5: "Heavy",
  };
  return labels[weight];
};

const getPlateDisplay = (
  hasPlate: boolean,
  material: "Nylon" | "Plastic" | "Carbon" | null
): { icon: string; label: string } => {
  if (!hasPlate) return { icon: "—", label: "Standard" };
  return { icon: "⚡", label: material || "Plate" };
};

const getBadgeText = (type: ShoeCardProps["shoe"]["recommendationType"]): string => {
  return type === "trade_off_option" ? "TRADE-OFF" : "CLOSE MATCH";
};

export function ShoeCard({ shoe, role }: ShoeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.daily;
  const weightLabel = getWeightLabel(shoe.weight_feel_1to5);
  const plateDisplay = getPlateDisplay(shoe.has_plate, shoe.plate_material);
  const badgeText = getBadgeText(shoe.recommendationType);

  return (
    <article
      className="relative w-full max-w-[90vw] min-w-[320px] rounded-2xl p-6"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderLeft: `2px solid ${roleColor}`,
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Brand Logo Placeholder */}
      <div className="text-center mb-4">
        {/* TODO: Replace with brand logo SVG */}
        <span className="text-[55px] font-semibold text-foreground/80 uppercase leading-none">
          {shoe.brand}
        </span>
      </div>

      {/* Shoe Name */}
      <h2 className="text-2xl font-bold text-foreground text-center mb-4 lowercase">
        {shoe.model} {shoe.version}
      </h2>

      {/* Badge */}
      <div className="flex justify-center mb-6">
        <span
          className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-md font-medium"
          style={{
            backgroundColor: `${roleColor}26`,
            border: `1px solid ${roleColor}66`,
            color: roleColor,
            boxShadow: `0 0 12px ${roleColor}33`,
            letterSpacing: "0.5px",
          }}
        >
          {badgeText}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-foreground/10 mb-4" />

      {/* Match Reason */}
      <p className="text-base text-foreground/80 leading-relaxed mb-4 line-clamp-3 text-center italic">
        "{shoe.matchReason}"
      </p>

      {/* Divider */}
      <div className="h-px bg-foreground/10 mb-4" />

      {/* Key Strengths */}
      <ul className="space-y-2 mb-4">
        {shoe.keyStrengths.map((strength, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[15px] text-foreground/70"
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
      <div className="h-px bg-foreground/10 mb-4" />

      {/* Specs Row */}
      <div className="flex justify-center items-center gap-3 text-sm text-foreground/60 mb-4 flex-wrap">
        <span>⚖️ {weightLabel}</span>
        <span className="text-foreground/30">•</span>
        <span>📏 {shoe.heel_drop_mm}mm</span>
        <span className="text-foreground/30">•</span>
        <span>
          {plateDisplay.icon} {plateDisplay.label}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-foreground/10 mb-4" />

      {/* Expandable Section Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-foreground/60 hover:text-foreground/80 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
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
        <div className="pt-4 border-t border-foreground/10 space-y-4">
          {/* Why it matches */}
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-2">
              Why it matches your preferences:
            </h4>
            <p className="text-sm text-foreground/60">
              Based on your profile, this shoe aligns well with your training
              needs and feel preferences.
            </p>
          </div>

          {/* Trade-offs (conditional) */}
          {shoe.tradeOffs && shoe.tradeOffs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground/80 mb-2">
                Trade-offs to consider:
              </h4>
              <ul className="space-y-1">
                {shoe.tradeOffs.map((tradeOff, i) => (
                  <li key={i} className="text-sm text-foreground/60">
                    • {tradeOff}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Similar alternatives (conditional) */}
          {shoe.similar_to && (
            <div>
              <h4 className="text-sm font-medium text-foreground/80 mb-2">
                Similar alternatives:
              </h4>
              <p className="text-sm text-foreground/60">{shoe.similar_to}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default ShoeCard;
