import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OnboardingLayout from "@/components/OnboardingLayout";
import PageTransition from "@/components/PageTransition";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useProfile } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";

interface ModeButtonProps {
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

const ModeButton = ({
  label,
  description,
  disabled = false,
  disabledReason,
  onClick,
}: ModeButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full min-h-[100px] p-5 rounded-lg text-left transition-all duration-200",
      "bg-card-foreground/5 border",
      disabled
        ? "border-card-foreground/10 cursor-not-allowed opacity-60"
        : "border-card-foreground/20 hover:border-orange-500/50 hover:shadow-[0_0_12px_rgba(251,146,60,0.15)]"
    )}
  >
    <span
      className={cn(
        "block text-base font-medium transition-colors mb-2",
        disabled ? "text-card-foreground/40" : "text-card-foreground/90"
      )}
    >
      {label}
    </span>
    <span
      className={cn(
        "block text-sm",
        disabled ? "text-card-foreground/30" : "text-card-foreground/50"
      )}
    >
      {description}
    </span>
    {disabled && disabledReason && (
      <span className="block text-xs italic text-card-foreground/40 mt-3">
        {disabledReason}
      </span>
    )}
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
          <div className="flex-1 flex flex-col justify-center px-6 md:px-8 pb-8">
            {/* Heading */}
            <p className="italic text-orange-500 mb-6" style={{ fontSize: '16px' }}>
              what would you like to do?
            </p>

            {/* Mode buttons */}
            <div className="space-y-4">
              <ModeButton
                label="i need cinda to help find shoes for a specific run type"
                description="tell cinda what you need and get recommendations"
                onClick={handleShoppingMode}
              />
              <ModeButton
                label="i need cinda to analyse my current rotation"
                description="cinda will identify gaps and suggest what's missing"
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
