import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

interface ShoeCardProps {
  shoe: {
    shoeId?: string;
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

const getPlateLabel = (
  hasPlate: boolean,
  material: "Nylon" | "Plastic" | "Carbon" | null
): string => {
  if (!hasPlate) return "None";
  return material || "Standard";
};

const formatBrand = (brand: string): string => {
  return brand
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatModel = (model: string, version: string): string => {
  // Title case for model and version
  const formatWord = (word: string): string => {
    // Handle special cases like "FuelCell", "ZoomX", etc.
    if (word.toLowerCase() === 'fuelcell') return 'FuelCell';
    if (word.toLowerCase() === 'zoomx') return 'ZoomX';
    if (word.toLowerCase() === 'vaporfly') return 'Vaporfly';
    if (word.toLowerCase() === 'alphafly') return 'Alphafly';
    if (word.toLowerCase() === 'superblast') return 'Superblast';
    if (word.toLowerCase() === 'metaspeed') return 'Metaspeed';
    // Default title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };
  
  const modelFormatted = model.split(' ').map(formatWord).join(' ');
  const versionFormatted = version ? ` ${version}` : '';
  return `${modelFormatted}${versionFormatted}`;
};

export function ShoeCard({ shoe, role }: ShoeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.daily;
  const weightLabel = getWeightLabel(shoe.weight_feel_1to5);
  const plateLabel = getPlateLabel(shoe.has_plate, shoe.plate_material);
  const isTradeOff = shoe.recommendationType === "trade_off_option";

  return (
    <>
      <style>{`
        @keyframes border-glow {
          0%, 100% { 
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15), 0 0 20px ${roleColor}33;
          }
          50% { 
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15), 0 0 30px ${roleColor}55;
          }
        }
        @keyframes text-shimmer {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
      `}</style>
      <article
        className="relative w-full max-w-[90vw] min-w-[320px] rounded-2xl p-6"
        style={{
          background: "rgba(26, 26, 30, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderLeft: `2px solid ${roleColor}`,
          animation: "border-glow 2s ease-in-out infinite",
        }}
      >
      {/* Shoe Image */}
      <div className="flex justify-center mb-5">
        <img
          src={shoe.shoeId ? `/shoes/${shoe.shoeId}.png` : '/shoes/cinda_placeholder_shoeart.png'}
          onError={(e) => {
            e.currentTarget.src = '/shoes/cinda_placeholder_shoeart.png';
          }}
          alt={shoe.fullName}
          className="w-40 h-auto block"
        />
      </div>

      {/* Brand Name */}
      <div className="text-center mb-1">
        <span className="text-lg font-semibold text-foreground/80">
          {formatBrand(shoe.brand)}
        </span>
      </div>

      {/* Shoe Model (bigger than brand) */}
      <h2 
        className="text-[28px] font-bold text-foreground text-center mb-4"
        style={{ animation: "text-shimmer 3s ease-in-out infinite" }}
      >
        {formatModel(shoe.model, shoe.version)}
      </h2>

      {/* Badge */}
      <div className="flex justify-center mb-6">
        <span
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide px-3 py-1.5 rounded-md font-medium text-white"
          style={{
            backgroundColor: isTradeOff ? "#10B981" : "#64748b",
            letterSpacing: "0.5px",
          }}
        >
          <Check size={14} aria-hidden="true" />
          {isTradeOff ? "TRADE-OFF" : "CLOSE MATCH"}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-foreground/10 mb-4" />

      {/* Match Reason */}
      <p className="text-base text-foreground/70 leading-relaxed mb-4 line-clamp-3 text-center italic">
        {shoe.matchReason}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-foreground/60 mb-1">
            Weight
          </div>
          <div className="text-base font-semibold text-foreground">
            {weightLabel}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-foreground/60 mb-1">
            Heel Drop
          </div>
          <div className="text-base font-semibold text-foreground">
            {shoe.heel_drop_mm}mm
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-foreground/60 mb-1">
            Plate
          </div>
          <div className="text-base font-semibold text-foreground">
            {plateLabel}
          </div>
        </div>
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
    </>
  );
}

export default ShoeCard;
