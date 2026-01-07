import { useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";

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
      "group relative w-full flex-1 min-h-[160px] md:min-h-[180px] p-6 md:p-8 rounded-2xl text-left transition-all duration-300",
      "flex flex-col items-center justify-center gap-4",
      // Glass morphism effect
      "bg-card-foreground/[0.03] backdrop-blur-sm",
      // Border with gradient effect
      "border border-card-foreground/10",
      disabled
        ? "cursor-not-allowed opacity-50"
        : [
            // Hover effects
            "hover:scale-[1.02] hover:border-orange-500/40",
            "hover:shadow-[0_0_30px_rgba(251,146,60,0.2),0_0_60px_rgba(251,146,60,0.1)]",
            "hover:bg-card-foreground/[0.06]",
            // Idle glow animation
            "animate-glow-pulse",
          ]
    )}
    style={{
      // Subtle gradient border overlay
      background: disabled
        ? undefined
        : "linear-gradient(135deg, rgba(251,146,60,0.03) 0%, transparent 50%, rgba(251,146,60,0.02) 100%)",
    }}
  >
    {/* Glow backdrop for enabled cards */}
    {!disabled && (
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(251,146,60,0.08) 0%, transparent 70%)",
        }}
      />
    )}

    {/* Icon */}
    <div
      className={cn(
        "w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center transition-all duration-300",
        disabled
          ? "bg-card-foreground/5 text-card-foreground/30"
          : "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 group-hover:scale-110"
      )}
    >
      {icon}
    </div>

    {/* Text content */}
    <div className="text-center relative z-10">
      <span
        className={cn(
          "block text-lg md:text-xl font-semibold transition-colors mb-2",
          disabled
            ? "text-card-foreground/40"
            : "text-card-foreground/90 group-hover:text-card-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "block text-sm md:text-base",
          disabled
            ? "text-card-foreground/25"
            : "text-card-foreground/50 group-hover:text-card-foreground/60"
        )}
      >
        {description}
      </span>
      {disabled && disabledReason && (
        <span className="block text-xs italic text-card-foreground/35 mt-3 max-w-[240px] mx-auto">
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

          {/* Content - fills available space */}
          <div className="flex-1 flex flex-col px-6 md:px-8 pb-6 md:pb-8 min-h-0">
            {/* Heading */}
            <p
              className="italic text-orange-500 mb-6 text-center"
              style={{ fontSize: "18px" }}
            >
              what would you like to do?
            </p>

            {/* Mode cards - take remaining space */}
            <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
              <ModeCard
                icon={<Compass className="w-7 h-7 md:w-8 md:h-8" />}
                label="find shoes for a specific run type"
                description="tell cinda what you need and get recommendations"
                onClick={handleShoppingMode}
              />
              <ModeCard
                icon={<Sparkles className="w-7 h-7 md:w-8 md:h-8" />}
                label="analyse my current rotation"
                description="ask cinda to identify any gaps and suggest improvements"
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
    </>
  );
};

export default ProfileBuilderStep4;
