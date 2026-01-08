import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";

// Custom Discovery Icon - Geometric compass with targeting crosshairs
const DiscoveryIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Outer targeting circle */}
    <circle
      cx="16"
      cy="16"
      r="12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeOpacity="0.5"
    />
    {/* Inner circle */}
    <circle
      cx="16"
      cy="16"
      r="6"
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity="0.4"
    />
    {/* Crosshair lines */}
    <path
      d="M16 2V7M16 25V30M2 16H7M25 16H30"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.6"
    />
    {/* Center target dot */}
    <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    {/* Direction indicator - arrow pointing NE */}
    <path
      d="M22 10L24 8M24 8L22 8M24 8V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Accent dots at cardinal points */}
    <circle cx="16" cy="4" r="1" fill="currentColor" fillOpacity="0.7" />
    <circle cx="28" cy="16" r="1" fill="currentColor" fillOpacity="0.5" />
  </svg>
);

// Custom Analysis Icon - Connected nodes / data visualization
const AnalysisIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Connection lines */}
    <path
      d="M10 10L16 16M16 16L22 10M16 16L10 22M16 16L22 22M16 16V6M16 16V26"
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
    {/* Central hexagon */}
    <path
      d="M16 12L19.5 14V18L16 20L12.5 18V14L16 12Z"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="1"
    />
    {/* Outer nodes */}
    <circle cx="10" cy="10" r="2.5" fill="currentColor" fillOpacity="0.7" />
    <circle cx="22" cy="10" r="2.5" fill="currentColor" fillOpacity="0.9" />
    <circle cx="10" cy="22" r="2.5" fill="currentColor" fillOpacity="0.5" />
    <circle cx="22" cy="22" r="2.5" fill="currentColor" fillOpacity="0.7" />
    {/* Top and bottom nodes */}
    <circle cx="16" cy="6" r="2" fill="currentColor" fillOpacity="0.6" />
    <circle cx="16" cy="26" r="2" fill="currentColor" fillOpacity="0.4" />
    {/* Center node */}
    <circle cx="16" cy="16" r="3" fill="currentColor" />
    {/* Accent sparkle */}
    <path
      d="M26 6L27 8L29 7L27 8L28 10L27 8L25 9L27 8L26 6Z"
      fill="currentColor"
      fillOpacity="0.6"
    />
  </svg>
);

interface ModeCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

const ModeCard = ({
  icon,
  label,
  description,
  disabled = false,
  disabledReason,
  onClick,
}: ModeCardProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "group relative w-full p-5 rounded-xl text-left transition-all duration-300",
      "flex flex-row items-center gap-5",
      // Glass morphism effect
      "bg-card-foreground/[0.03] backdrop-blur-sm",
      // Border with slate blue
      "border border-slate-500/30",
      // Overflow hidden for shimmer effect
      "overflow-hidden",
      disabled
        ? "cursor-not-allowed opacity-50"
        : [
            // Hover effects - slate blue with scale
            "hover:scale-[1.02] hover:border-slate-400/50",
            "hover:shadow-[0_0_30px_rgba(148,163,184,0.2),0_0_60px_rgba(148,163,184,0.1)]",
            "hover:bg-card-foreground/[0.06]",
          ]
    )}
    style={{
      // Subtle gradient border overlay - slate blue
      background: disabled
        ? undefined
        : "linear-gradient(135deg, rgba(100,116,139,0.05) 0%, transparent 50%, rgba(100,116,139,0.03) 100%)",
    }}
  >
    {/* Shimmer effect on hover */}
    {!disabled && (
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, transparent 40%, rgba(148,163,184,0.08) 50%, transparent 60%)",
          animation: "shimmer 1.5s ease-in-out",
        }}
      />
    )}

    {/* Glow backdrop for enabled cards - slate blue */}
    {!disabled && (
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(148,163,184,0.1) 0%, transparent 70%)",
        }}
      />
    )}

    {/* Icon */}
    <div
      className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0",
        disabled
          ? "bg-card-foreground/5 text-card-foreground/30"
          : "bg-slate-500/10 text-slate-400 group-hover:bg-slate-400/20 group-hover:text-slate-300 group-hover:scale-110"
      )}
    >
      {icon}
    </div>

    {/* Text content */}
    <div className="text-left relative z-10 flex-1">
      <span
        className={cn(
          "block text-sm font-medium transition-colors mb-1",
          disabled
            ? "text-card-foreground/40"
            : "text-card-foreground/90 group-hover:text-card-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "block text-xs",
          disabled
            ? "text-card-foreground/25"
            : "text-card-foreground/50 group-hover:text-card-foreground/60"
        )}
      >
        {description}
      </span>
      {disabled && disabledReason && (
        <span className="block text-xs italic text-card-foreground/35 mt-2">
          {disabledReason}
        </span>
      )}
    </div>
  </button>
);

const ProfileBuilderStep4 = () => {
  const navigate = useNavigate();
  const { profileData } = useProfile();

  const hasShoes = profileData.step3.currentShoes.length > 0;

  const handleBack = () => {
    navigate("/profile/step3");
  };

  const handleShoppingMode = () => {
    // TODO: Navigate to Shopping Mode flow (Step 4a)
    console.log("Shopping Mode selected");
  };

  const handleAnalysisMode = () => {
    if (!hasShoes) return;
    // TODO: Navigate to Analysis Mode flow (Step 4a)
    console.log("Analysis Mode selected");
  };

  return (
    <>
      <AnimatedBackground />
      <OnboardingLayout>
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
            <span className="text-xs text-card-foreground/50">step 4 of 4</span>
          </header>

          {/* Content */}
          <div className="flex flex-col px-6 md:px-8 pb-6 md:pb-8">
            {/* Heading - orange, matches question text size */}
            <p className="italic text-orange-500 mb-6 text-left text-sm">
              running basics and current shoes done, now... how can cinda help you?
            </p>

            {/* Mode cards - stacked vertically, full width */}
            <div className="flex flex-col gap-4">
              <ModeCard
                icon={<DiscoveryIcon className="w-6 h-6" />}
                label="discovery"
                description="looking for something specific? tell us what you need and we'll match you perfectly"
                onClick={handleShoppingMode}
              />
              <ModeCard
                icon={<AnalysisIcon className="w-6 h-6" />}
                label="analysis"
                description="already have shoes? we'll analyze your rotation and spot what's missing"
                disabled={!hasShoes}
                disabledReason={
                  !hasShoes
                    ? "to analyse your rotation, you need to add at least one shoe first"
                    : undefined
                }
                onClick={handleAnalysisMode}
              />
            </div>
          </div>
        </PageTransition>
      </OnboardingLayout>

      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
};

export default ProfileBuilderStep4;
